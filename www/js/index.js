var carersApp={
	
	
	
	//INITIALISATION
	
	//Initialise application
	initialise:function(){
		//Back button
			document.addEventListener('backbutton',carersApp.handleBackButton,false);
		//Connection state
			document.addEventListener('online',carersApp.processQueue,false);
		//iOS
			if(/constructor/i.test(window.HTMLElement))$('body').addClass('ios');
		//Login
			$('.login_form').on('submit',carersApp.submitLogin);
		//Roster
			carersApp.template.rosterItem=$('.roster_list').html().replace(/\t|\r|\n/gi,'');
		//Appointment
			carersApp.template.appointmentForm=$('.appointment_form').html().replace(/\t|\r|\n/gi,'');
			carersApp.template.noteItem=$('.note_list').html().replace(/\t|\r|\n/gi,'');
			carersApp.template.signaturePanel=$('.signature_layout').html().replace(/\t|\r|\n/gi,'');
		//First page
			carersApp.showPage('.login_page');
			//carersApp.loadRoster();
			//carersApp.buildAppointmentForm(0);
	},
	//Persistent variables
		data:{
			//Session values for appointment form clock panel
				clock:{},
			//Session values for appointment form signature panel
				signature:{},
			//Session values for appointment form photo panel
				photo:{},
			//Session values for roster map panel
				map:{},
			//Data for appointment form note panel 
				notes:[
					'Shortness of breath.',
					'Reduced appetite, food left uneaten.',
					'Walking very slowly and difficulty balancing.',
					'Unable to toilet.',
					'Unable to manage showering alone.',
					'Too unwell to leave the house for appointment.'
				]
		},
		//HTML templates for repeaters
		template:{},
	
	
	
	//UTILITIES
	
	//Show a page
	showPage:function(page,timer){
		if($('.active_page')[0]){
			if(timer==0){
				$('.active_page').hide();
				$('body').scrollTop(0);
				$('.active_page').removeClass('active_page');
				$(page).show().addClass('active_page');
			}
			else{
				$('.active_page').fadeOut(function(){
					$('body').scrollTop(0);
					$('.active_page').removeClass('active_page');
					$(page).fadeIn(function(){
						$(page).addClass('active_page');
					});
				});
			}
		}
		else $(page).fadeIn(function(){
			$(page).addClass('active_page');
		});
	},	
	
	//Display notification or confirmation dialogue
	showMessage:function(type,text,process){
		if(type=='confirm')$('.confirm_button').show();
		else $('.confirm_button').hide();
		$('.error_page span.fa').not('.confirm_buttons span.fa').hide();
		$('.error_page span.icon_'+type).show();
		$('.error_text').html(text.replace(/\.\s\b/gi,'.<br/><br/>'));
		//$('body').addClass('no_scroll');
		if(window.navigator.vibrate&&type=='error')window.navigator.vibrate(200);
		$('.error_page').removeClass('error confirm warning notification').addClass(type+' active_overlay').fadeIn(function(){
			if(typeof process=='function'&&type!='confirm')(process)();
			$(this).find('.close_button, .confirm_no').off().on('click',function(){
				$('.error_page').removeClass('active_overlay').fadeOut();
				//$('body').removeClass('no_scroll');
			});
			$(this).find('.confirm_yes').off().on('click',function(){
				//$('body').removeClass('no_scroll');
				(process)();
				$('.error_page').removeClass('active_overlay').fadeOut();
			});
		});
	},
	
	//Format date strings
	processDate:function(dateObj){
		if(typeof dateObj!='object'){
			var s=dateObj.split('/');
			dateObj=new Date();
			dateObj.setFullYear(s[2],parseInt(s[1])-1,s[0]);
		}
		dateObj.time=dateObj.getTime();
		dateObj.dd=parseInt(dateObj.getDate());
		dateObj.mm=parseInt(dateObj.getMonth()+1);
		dateObj.yyyy=dateObj.getFullYear();
		dateObj.hour=((dateObj.getHours()<10)?'0':'')+dateObj.getHours();
		dateObj.min=((dateObj.getMinutes()<10)?'0':'')+dateObj.getMinutes();
		dateObj.dateFormat=dateObj.dd+'/'+dateObj.mm+'/'+dateObj.yyyy;
		dateObj.shortDateFormat=dateObj.dd+'/'+dateObj.mm;
		dateObj.timeFormat=dateObj.hour+':'+dateObj.min;
		var d=['Su','Mo','Tu','We','Th','Fr','Sa'];
		dateObj.dayFormat=d[dateObj.getDay()];
		return dateObj;
	},
	
	//Intercept device back button
	handleBackButton:function(){
		if($('.active_overlay')[0]){
			$('.active_overlay').removeClass('active_overlay').fadeOut();
			return true;
		}
		if($('.login_page').hasClass('active_page')){
			navigator.app.exitApp();
			return true;
		}
		if($('.roster_page').hasClass('active_page')){
			carersApp.showMessage('confirm','You will be logged out',carersApp.logOut);
			return true;
		}
		if($('.appointment_page').hasClass('active_page')){
			carersApp.cancelAppointment();
			return true;
		}
	},
	
	
	
	//LOGIN
	
	//Submit login credentials
	submitLogin:function(){
		var fail=false;
		if(!$('#user').val()||!$('#pass').val())fail=true;
		else{
			if(carersApp.authenticateLogin()==true)carersApp.loadRoster();
			else fail=true;
		}
		if(fail)carersApp.showMessage('error','Please enter a valid username and password');
		return false;
	},
	//Check login credentials
		authenticateLogin:function(){
			return true;
		},
		logOut:function(){
			carersApp.showPage('.login_page',0);
		},
	
	
	
	//ROSTER
	
	//Load roster data (Roster step 1)
	loadRoster:function(force){
		if(window.navigator.onLine==true){
			if(new Date().getTime()>parseInt(window.localStorage.getItem('ca-roster-time'))+1800000||
				window.localStorage.getItem('ca-roster-time')==null||
				window.localStorage.getItem('ca-roster')==null||
				force==true){
					$.ajax({
						url:'https://www.multibaseit.com.au/ca/roster.aspx',
						dataType:'json',
						crossDomain:true,
						data:{
							time:new Date().getTime(),
							method:'get_roster'
						},
						timeout:10000,
						success:function(data,status,request){
							carersApp.storeLocalRoster(data);
						},
						error:function(request,status,error){
							carersApp.showServerError(request,status,error);
						}
					});
			}
			else carersApp.buildRosterList();
		}
		else{
			if(!$('.error_page').hasClass('active_overlay'))carersApp.showMessage('warning','Your roster cannot be updated while your device is offline',carersApp.buildRosterList);
			else carersApp.buildRosterList();
		}
	},
	//Store loaded roster data (Roster step 2) 
		storeLocalRoster:function(data){
			window.localStorage.setItem('ca-roster',JSON.stringify(data));
			window.localStorage.setItem('ca-roster-time',new Date().getTime());
			carersApp.buildRosterList();
		},
	//Display loaded roster data (Roster step 3)
		buildRosterList:function(){
			var r=JSON.parse(window.localStorage.getItem('ca-roster'));
			if(!$.isEmptyObject(r)){
				var i=0,s,h=[],l,d,n=new Date();
				n.setHours(0);
				n.setMinutes(0);
				n.setSeconds(0);
				while(i<Object.keys(r).length){
					d=carersApp.processDate(r[i].date);
					if(d.time>n.getTime()){
						c=(r[i].appointmentStatus)?' '+r[i].appointmentStatus.toLowerCase():'';
						s=carersApp.template.rosterItem.split('-data-');
						h.push(
							s[0]+((l!=d.dd)?'roster_divider':'')+c+
							s[1]+i+
							s[2]+r[i].geocode+
							s[3]+d.dayFormat+
							s[4]+d.shortDateFormat+
							s[5]+r[i].startTime+
							s[6]+r[i].finishTime+
							s[7]+r[i].clientFirstName+
							s[8]+r[i].clientLastName+
							s[9]+r[i].clientStreet+
							s[10]+r[i].clientSuburb+
							s[11]+r[i].serviceDescription+
							s[12]
						);
					}
					i++
					l=d.dd;
				}
				$('.roster_list').fadeIn().removeClass('roster_list_filtered').html(h.join(''));
			//Roster items
				$('.roster_list .roster_item').not('.pending,.submitted').each(function(){
					$(this).on('click',function(){
						carersApp.buildAppointmentForm($(this).attr('data-appointment-index'));
					});
					$(this).find('.roster_map').on('click',function(){
						event.stopPropagation();
						carersApp.data.map.info=$(this).siblings('.roster_client').html();
						carersApp.showMapPanel($(this).parent().attr('data-appointment-geocode'));
					});
				});
				$('.roster_item.pending, .roster_item.submitted').each(function(){
					$(this).on('click',function(){
						carersApp.showMessage('error','This appointment has been submitted');
					});
				});
			//Roster search
				$('.search_form').on('submit',function(){
					$('#search_form_value').blur();
					return false;
				});
				$('#search_form_value').off().on('keyup',carersApp.filterRosterList).val('');
				$('.roster_filter_clear').off().on('click',function(){
					$('#search_form_value').val('');
					carersApp.filterRosterList();
				});
			//Roster update
				$('.roster_update').off().on('click',carersApp.forceRosterLoad);
				var u=carersApp.processDate(new Date(parseInt(window.localStorage.getItem('ca-roster-time'))));
				$('.roster_update span').not('.fa').html(u.dateFormat+' '+u.timeFormat);
				$('.roster_update .fa').removeClass('fa-spin');
			//Ready
				if(!$('.roster_page').hasClass('active_page')){
					if($('.error_page').hasClass('active_overlay'))carersApp.showPage('.roster_page',0);
					else carersApp.showPage('.roster_page');
				}
				$('.roster_page > .close_button').off().on('click',function(){
					carersApp.showMessage('confirm','You will be logged out',carersApp.logOut);
				});
				carersApp.processQueue();
			}
			else if(!$('.error_page').hasClass('active_overlay'))carersApp.showMessage('warning','You have no rostered appointments');
		},
	//Check request result for errors
		showServerError:function(request,status,error){
			var a=
				("Request = "+request.responseText)+
				("\nStatus = "+status)+
				("\nError = "+error);
			//alert(a);
			carersApp.showMessage('error','Your roster could not be updated',carersApp.buildRosterList);
		},
	//Force reload from server
		forceRosterLoad:function(){
			if(window.navigator.onLine==true){
				$('.roster_list').fadeOut();
				$('.roster_update .fa').addClass('fa-spin');
				carersApp.loadRoster(true);
			}
			else carersApp.showMessage('error','Your roster cannot be updated while your device is offline');
		},
	//Search(filter) roster list
		filterRosterList:function(){
			var s=$('#search_form_value')[0].value.trim().toLowerCase();
			if(s.length>1){
				$('.roster_list').addClass('roster_list_filtered');
				$('.roster_item').each(function(){
					if($(this).text().toLowerCase().indexOf(s)<0)$(this).removeClass('roster_item_filtered');
					else{
						$(this).addClass('roster_item_filtered');
						if($(this).prev().hasClass('roster_item_filtered')&&!$(this).hasClass('roster_divider'))$(this).addClass('roster_item_filtered_sibling');
						else $(this).removeClass('roster_item_filtered_sibling');
					}
				});
				$('.roster_item.roster_item_filtered').first().addClass('first_item');
				$('.roster_filter_clear').show();
			}
			else{
				$('.roster_list').removeClass('roster_list_filtered');
				$('.roster_item_filtered').removeClass('roster_item_filtered roster_item_filtered_sibling first_item');
				$('.roster_filter_clear').hide();
			}
		},
	
	
	
	//APPOINTMENT FORM
	
	//Show appointment form (Appointment step 1)
	buildAppointmentForm:function(id){
		//Form data
			var a=JSON.parse(window.localStorage.getItem('ca-roster'))[id],
			s=carersApp.template.appointmentForm.split('-data-'),
			d=carersApp.processDate(a.date);
			h=[];
			h.push(
				s[0]+a.clientFirstName+
				s[1]+a.clientLastName+
				s[2]+d.dateFormat+
				s[3]+a.startTime+
				s[4]+a.finishTime+
				s[5]+a.serviceDescription+
				s[6]
			);
			$('.appointment_form').html(h.join(''));
		//Start time
			/*Option: populate start time from roster data
				var asv=carersApp.processDate(a.date);
					asv.setHours(parseInt(a.startTime));
					asv.setMinutes(a.startTime.substring(a.startTime.indexOf(':')+1));
					asv.setSeconds(0);
				$('#appointment_start_value').val(asv.getTime());*/
			$('.appointment_page .appointment_start').on('click',function(){
				carersApp.data.clock.active=$(this);
				carersApp.showAppointmentClock($('#appointment_start_value').val());
			});
		//Finish time
			/*Option: populate finish time from roster data
				var afv=carersApp.processDate(a.date);
					afv.setHours(parseInt(a.finishTime));
					afv.setMinutes(a.finishTime.substring(a.finishTime.indexOf(':')+1));
					afv.setSeconds(0);
				$('#appointment_finish_value').val(afv.getTime());*/
			$('.appointment_page .appointment_finish').on('click',function(){
				carersApp.data.clock.active=$(this);
				carersApp.showAppointmentClock($('#appointment_finish_value').val());
			});
			$('.appointment_page .appointment_travel').on('click',function(){
				carersApp.showTravelPanel();
			});
		//Clock panel
			$('.clock_split_24').on('click',function(){
				carersApp.setClockSplit(24,$(this));
			});
			$('.clock_split_12').on('click',function(){
				carersApp.setClockSplit(12,$(this));
			});
			$('.clock_split_icon').on('click',function(){
				if($('.clock_split_12.split_active')[0])carersApp.setClockSplit(24,$('.clock_split_24'));
				else carersApp.setClockSplit(12,$('.clock_split_12'));
			});
			$('.clock_number').each(function(){
				$(this).on('click',function(){
					$(this).addClass('number_active').siblings().removeClass('number_active');
					carersApp.setClockTime($(this));
				});
			});
		//Travel panel
			$('.slider_handle').draggable({
				containment:'parent',
				axis:'y',
				start:function(){
					$('.slider_handle').addClass('active');
				},
				drag:carersApp.setSliderValue,
				stop:function(){
					if($('.display_km').html()=='0')$(this).removeClass('active');
				}
			});
			$('.slider_track').on('click',carersApp.jumpSlider);
		//Note panel
			$('.appointment_notes textarea').on('focus',function(){
				$(this).parent().addClass('active');
			});
			$('.appointment_notes textarea').on('blur',function(){
				$(this).parent().removeClass('active');
			});
			$('.note_add').on('click',function(){
				carersApp.showNotePanel();
			});
		//Signature panel
			$('.appointment_sign').on('click',carersApp.showSignaturePanel);
		//Photo panel
			$('.appointment_photo').on('click',carersApp.openCamera);
		//Geocode field
			carersApp.getGeocode(carersApp.setGeocodeFormValue);
		//Ready
			$('#appointment_index_value').val(id);
			$('.appointment_form').on('submit',function(){
				return false;
			});
			$('#appointment_submit').off().on('click',carersApp.submitAppointment);
			$('#appointment_cancel').off().on('click',carersApp.cancelAppointment);
			$('.appointment_page > .close_button').off().on('click',carersApp.cancelAppointment);			
			carersApp.showPage('.appointment_page');
	},
	
	//Show clock panel for appointment form
	showAppointmentClock:function(timestamp){
		$('.split_active').removeClass('split_active');
		$('.number_active').removeClass('number_active');	
		if(!timestamp){
			var t=new Date();
				t.setMinutes(Math.round(t.getMinutes()/5)*5);
			timestamp=t.getTime();
		}
		var d=new Date(parseInt(timestamp));
			d.setMinutes(Math.round(d.getMinutes()/5)*5);
		carersApp.data.clock.time=parseInt(timestamp);
		if(d.getHours()==0){
			$('.clock_hours .clock_0').addClass('number_active');
			carersApp.setClockSplit(24);
		}
		else if(d.getHours()<12){
			$('.clock_hours .clock_'+(d.getHours())).addClass('number_active');
			carersApp.setClockSplit(12);
		}
		else if(d.getHours()==12){
			$('.clock_hours .clock_0').addClass('number_active');
			carersApp.setClockSplit(12);
		}
		else if(d.getHours()>12){
			$('.clock_hours .clock_'+(d.getHours()-12)).addClass('number_active');
			carersApp.setClockSplit(24);
		}
		$('.clock_mins .clock_'+(d.getMinutes()/5)).addClass('number_active');
		carersApp.setClockTime();		
		$('.appointment_overlay .overlay_panel').hide();
		$('.appointment_overlay .clock_panel').show();
		$('.appointment_overlay .close_button').off().on('click',function(){
			if(carersApp.validateAppointmentTimes()==true){
				carersApp.hideAppointmentOverlay(function(){
					$(carersApp.data.clock.active).find('label > span').html($('.clock_hours .number_active .split_active').text()+':'+$('.clock_mins .number_active').text());
					$(carersApp.data.clock.active).addClass('completed');
				});
			}
			else carersApp.showMessage('error','The appointment finish time must be later than the start time');
		});
		carersApp.showAppointmentOverlay();
	},
	//Validate start and finish times for clock panel
		validateAppointmentTimes:function(){
			if(!$('#appointment_start_value').val()||!$('#appointment_finish_value').val())return true;
			if(new Date(parseInt($('#appointment_finish_value').val()))>new Date(parseInt($('#appointment_start_value').val())))return true;
			else return false;
		},
	//Toggle AM and PM for clock panel
		setClockSplit:function(split,element){
			if(split==12){
				$('.clock_split_12').addClass('split_active');
				$('.clock_split_24').removeClass('split_active');
				$('.display_split_24').removeClass('split_active').hide();
				$('.display_split_12').addClass('split_active').fadeIn();
			}
			else{
				$('.clock_split_24').addClass('split_active');
				$('.clock_split_12').removeClass('split_active');
				$('.display_split_12').removeClass('split_active').hide();
				$('.display_split_24').addClass('split_active').fadeIn();
			}
			if(element)carersApp.setClockTime();
		},
	//Set selected time for clock panel
		setClockTime:function(){
			var d=new Date(carersApp.data.clock.time);
				d.setHours(parseInt($('.clock_hours .number_active .split_active').text()));
				d.setMinutes(parseInt($('.clock_mins .number_active').text()));
			$('.clock_hand_hours').css('transform','rotate('+(($('.clock_hours .number_active').index()*30)-90)+'deg)');
			$('.clock_hand_mins').css('transform','rotate('+(($('.clock_mins .number_active').index()*30)-90)+'deg)');
			carersApp.data.clock.time=d.getTime();
			$(carersApp.data.clock.active).find('input').val(d.getTime());
			carersApp.setDisplayTime();
		},
	//Set text display for clock panel
		setDisplayTime:function(){
			$('.display_hours').html($('.clock_hours .number_active .split_active').text());
			$('.display_mins').html($('.clock_mins .number_active').text());
		},
	
	//Show travel panel for appointment form
	showTravelPanel:function(){
		$('.appointment_overlay .overlay_panel').hide();
		$('.appointment_overlay .travel_panel').show();
		if($('#appointment_travel_value').val()==0)carersApp.resetSlider();
		$('.appointment_overlay .close_button').off().on('click',function(){
			carersApp.hideAppointmentOverlay(function(){
				$('.appointment_travel label > span').html($('.display_km').text());
				$('#appointment_travel_value').val($('.display_km').text());
				if(parseInt($('#appointment_travel_value').val())!=0)$('.appointment_travel').addClass('completed');
			});
		});
		carersApp.showAppointmentOverlay();
	},
	//Reset slider for new appointment
		resetSlider:function(){
			$('.appointment_overlay .slider_handle').removeClass('active').css({'bottom':'0','top':'auto'});
			$('.display_km').html('0');
		},
	//Display slider value for travel panel
		setSliderValue:function(){
			$('.display_km').html(Math.round(($('.slider_handle').position().top/($('.form_slider').height()-$('.slider_handle').height()))*-100)+100);
		},
	//Jump slider to mouse click for travel panel
		jumpSlider:function(reset){
			var t=Math.max(0,Math.min((event.pageY-$(this).offset().top)-$('.slider_handle').height()/2,$('.slider_track').height()-$('.slider_handle').height()));
			$('.slider_handle').css('top',t);
			if(t<$('.slider_track').height()-$('.slider_handle').height())$('.slider_handle').addClass('active');
			else $('.slider_handle').removeClass('active');
			carersApp.setSliderValue();
		},
	
	//Show note panel for appointment form
	showNotePanel:function(){
		var i=0,h=[],
			s=carersApp.template.noteItem.split('-data-');
		while(i<carersApp.data.notes.length){
			h.push(
				s[0]+carersApp.data.notes[i]+
				s[1]
			);
			i++;
		}
		$('.note_list').html(h.join(''));
		$('.note_list li').each(function(){
			if($('#appointment_notes_value').val().indexOf($(this).find('.note_text').text())>-1)$(this).addClass('active');
			$(this).on('click',function(){
				$(this).toggleClass('active');
			});
		});
		$('.appointment_overlay .overlay_panel').hide();
		$('.appointment_overlay .note_panel').show();
		$('.appointment_overlay .close_button').off().on('click',function(){
			carersApp.hideAppointmentOverlay(function(){
				carersApp.addNoteText();
				$('#appointment_notes_value').blur();
			});
		});
		carersApp.showAppointmentOverlay();
	},
	//Process selected note text
		addNoteText:function(){
			var t=$('#appointment_notes_value').val();
			$('.note_text').each(function(){
				if($(this).parent().hasClass('active')&&t.indexOf($(this).text())<0)t+=(' '+$(this).text()+' ');
				if(!$(this).parent().hasClass('active')&&t.indexOf($(this).text())>-1)t=t.replace($(this).text(),'');
			});
			$('#appointment_notes_value').val(t.replace(/\s{2,}/gi,' ').trim());
		},
	
	//Show signature panel for appointment form - https://github.com/szimek/signature_pad
	showSignaturePanel:function(){
		$('.signature_button').off().on('click',function(){
			carersApp.data.signature.canvas.clear();
		});
		$('.appointment_overlay .overlay_panel').hide();
		$('.appointment_overlay .signature_panel').show();
		$('.appointment_overlay .close_button').off().on('click',function(){
			carersApp.hideAppointmentOverlay(function(){
				if(!carersApp.data.signature.canvas.isEmpty()){
					$('#appointment_sign_value').val(carersApp.data.signature.canvas.toDataURL());
					carersApp.data.signature.canvas.clear();
					$('.appointment_sign').addClass('completed');
				}
				else{
					$('#appointment_sign_value').val('');
					$('.appointment_sign').removeClass('completed');
				}
			});
		});
		carersApp.showAppointmentOverlay(carersApp.initialiseSignaturePanel);
	},
	//Resize signature canvas element
		initialiseSignaturePanel:function(){
			carersApp.data.signature.canvas=document.querySelector('canvas#signature_image');
			$(carersApp.data.signature.canvas).width($(document).width());
			$(carersApp.data.signature.canvas).height($(document).height());
			carersApp.data.signature.canvas.width=$(document).width();
			carersApp.data.signature.canvas.height=$(document).height();
			carersApp.data.signature.canvas=new SignaturePad(carersApp.data.signature.canvas);
		},
		
	//Open camera for appointment form
	openCamera:function(){
		if(window.navigator.camera){
			window.navigator.camera.getPicture(
				function(filename){
					$('#appointment_photo_value').val(filename);
					$('.appointment_photo').addClass('completed');
					carersApp.showCameraPanel();
				},
				function(error){
					carersApp.showMessage('error',error);
					$('.appointment_photo').removeClass('completed');
				},
				{
					quality:50,
					destinationType:Camera.DestinationType.FILE_URI,
					correctOrientation:true,
					saveToPhotoAlbum:false
				}
			);
		}
		//else carersApp.showMessage('error','No camera is available');
		else carersApp.showCameraPanel();
	},
	//Show camera panel for photo annotation
		showCameraPanel:function(){
			$('.appointment_overlay .overlay_panel').hide();
			$('.appointment_overlay .photo_panel').show();
			$('.appointment_overlay .photo_layout').css('background-image','url(\''+$('#appointment_photo_value').val()+'\')');
			$('.appointment_overlay .close_button').off().on('click',function(){
				carersApp.hideAppointmentOverlay(function(){
					if(!carersApp.data.photo.canvas.isEmpty()){
						$('#appointment_annotation_value').val(carersApp.data.photo.canvas.toDataURL());
						carersApp.data.photo.canvas.clear();
					}
					else $('#appointment_annotation_value').val('');
				});
			});
		carersApp.showAppointmentOverlay(carersApp.initialisePhotoPanel);
	},
	//Resize photo canvas element
		initialisePhotoPanel:function(){
			carersApp.data.photo.canvas=document.querySelector('canvas#photo_image');
			$(carersApp.data.photo.canvas).width($(document).width());
			$(carersApp.data.photo.canvas).height($(document).height());
			carersApp.data.photo.canvas.width=$(document).width();
			carersApp.data.photo.canvas.height=$(document).height();
			carersApp.data.photo.canvas=new SignaturePad(carersApp.data.photo.canvas);
			carersApp.data.photo.canvas.penColor='yellow';
		},
	
	//Show and hide map overlay
	showMapPanel:function(destination){
		if(window.navigator.onLine==true&&
			typeof window.navigator.geolocation==='object'&&
			typeof google==='object'&&
			typeof google.maps==='object'){
				$('#map_inner').empty();
				$('.map_icon').addClass('loading');
				$('.active_overlay').removeClass('active_overlay').hide();
				$('.map_page').addClass('active_overlay').fadeIn();
				$('.map_page .close_button').off().on('click',carersApp.hideMapPanel);
				if(parseInt(destination)+''!='NaN'){
					carersApp.data.map.destination=destination;
					carersApp.getGeocode(carersApp.initialiseMap);
				}
				else carersApp.showMessage('error','Maps are not available for this appointment',carersApp.hideMapPanel);
		}
		else{
			carersApp.showMessage('error','Maps cannot be used when your device is offline or location is turned off');
		}
	},
		hideMapPanel:function(){
			$('.map_page').removeClass('active_overlay').fadeOut(function(){
				$('.map_icon').removeClass('loading');
			});
		},
	//Initialise map for directions
		initialiseMap:function(){
			if(!new RegExp('error','gi').test(carersApp.data.map.origin)){
				a=carersApp.data.map.origin.split(',');
				b=carersApp.data.map.destination.split(',');
				var o=new google.maps.LatLng(parseFloat(a[0]),parseFloat(a[1])),
					d=new google.maps.LatLng(parseFloat(b[0]),parseFloat(b[1])),
					r={
						origin:o,
						destination:d,
						travelMode:'DRIVING'
					},
					s=new google.maps.DirectionsService();
				s.route(r,function(response,status){
					if(status=='OK'){
						$('.map_icon').removeClass('loading');
						var m=new google.maps.Map($('#map_inner')[0],{
								disableDefaultUI:true,
								zoomControl:true,
								streetViewControl:true
							}),
							g=new google.maps.DirectionsRenderer();
						g.setDirections(response);
						g.setMap(m);
					}
					else if($('.map_page.active_overlay')[0])carersApp.showMessage('error','An error has occurred at Google Maps',carersApp.hideMapPanel);
				});
			}
			else if($('.map_page.active_overlay')[0])carersApp.showMessage('error','Maps cannot be used when your device is offline or location is turned off',carersApp.hideMapPanel);
		},
	
	//Get geocode from device or Google API
	getGeocode:function(process){
		if(typeof window.navigator.geolocation==='object'){
			window.navigator.geolocation.getCurrentPosition(
				function(position){
					carersApp.data.map.origin=position.coords.latitude+','+position.coords.longitude;
					if(typeof process=='function')(process)();
				},
				function(error){
					carersApp.data.map.origin='Error: '+error.message;
					if(typeof process=='function')(process)();
				},
				{
					timeout:20000
				}
			);
		}
		else carersApp.showMessage('error','Your location cannot be determined');
	},
	//Add geocode value to appointment form
		setGeocodeFormValue:function(){
			$('#appointment_geocode_value').val(carersApp.data.map.origin);
			$('.location_check').hide();
			if(carersApp.data.map.origin.indexOf('Error')==0)$('.location_error').show();
			else $('.location_captured').show();
		},
	
	//Show and hide appointment overlay
	showAppointmentOverlay:function(process){
			$('body').addClass('no_scroll');
			$('.appointment_overlay').addClass('active_overlay').fadeIn(function(){
				if(typeof process=='function')(process)();
			});
		},
		hideAppointmentOverlay:function(process){
			if(typeof process=='function')(process)();
			$('body').removeClass('no_scroll');
			$('.appointment_overlay').removeClass('active_overlay').fadeOut();
		},
	
	//Submit appointment data
	submitAppointment:function(){
		if(carersApp.validateAppointment()==true){
			$('#appointment_timestamp_value').val(new Date().getTime());
			var f={};
			$('.appointment_form input, .appointment_form textarea').not('input[type=submit], input[type=reset]').each(function(){
				f[$(this).attr('id')]=$(this).val();
			});
			carersApp.addQueueItem(f);
		}
		else carersApp.showMessage('error','Please complete this form before saving');
		return false;
	},
	//Validate appointment data before submission
		validateAppointment:function(){
			var i=0;
			$('.appointment_form .hidden_field[data-required=true]').each(function(){
				if($(this).val()=='')return false;
				i++;
			});
			if(i==$('.appointment_form .hidden_field[data-required=true]').length)return true;
			return false;
		},
	//Cancel appointment submission
		cancelAppointment:function(){
			carersApp.showMessage('confirm','Information in this form will be discarded',carersApp.loadRoster);
		},
	//Add submission to processing queue and return to roster page
		addQueueItem:function(item){
			var q;
			if(window.localStorage.getItem('ca-queue')!=null){
				q=window.localStorage.getItem('ca-queue').split(']')[0]+','+JSON.stringify(item)+']';
			}
			else q='['+JSON.stringify(item)+']';
			window.localStorage.setItem('ca-queue',q);
			carersApp.updateAppointmentStatus(item.appointment_index_value,'Pending',carersApp.loadRoster);
		},
		
	
	
	//APPOINTMENT QUEUE + UPLOAD
	
	//Process appointment submission queue
	processQueue:function(){
		var q=$.makeArray(window.localStorage.getItem('ca-queue'));
		if(q.length>0&&window.navigator.onLine==true){
			$.ajax({
				type:'POST',
				url:'https://www.multibaseit.com.au/ca/process.aspx',
				dataType:'json',
				crossDomain:true,
				data:q[0],
				processData:false,
				success:function(data,status,request){
					carersApp.processQueueResponse();
				},
				error:function(request,status,error){
					carersApp.showServerError(request,status,error);
				}
			});
		}
	},
	//Process response and remove appointment from queue
		processQueueResponse:function(){
			var a=JSON.parse(window.localStorage.getItem('ca-queue'));
			var i=a.shift();
			if(a.length>0)window.localStorage.setItem('ca-queue',JSON.stringify(a));
			else window.localStorage.removeItem('ca-queue');
			carersApp.updateAppointmentStatus(i.appointment_index_value,'Submitted',function(){
				carersApp.uploadImageFile(
					i.appointment_photo_value,
					i.appointment_index_value+'-'+i.appointment_timestamp_value
				);
			});
		},
	//Update appointment status in stored roster data
		updateAppointmentStatus:function(id,status,process){
			var r=JSON.parse(window.localStorage.getItem('ca-roster'));
			r[id].appointmentStatus=status;
			window.localStorage.setItem('ca-roster',JSON.stringify(r));
			$('.roster_item[data-appointment-index='+(id)+']').addClass(status.toLowerCase());
			if(typeof process=='function')(process)();
		},
	//Upload image file
		uploadImageFile:function(url,id){
			if(window.cordova&&url.indexOf(' ')<0){
				var o=new window.FileUploadOptions();
					o.fileKey="file";
					o.fileName=id+url.substr(url.lastIndexOf('.')+1);
					o.mimeType="image/jpeg";
					o.chunkedMode=false;
				var t=new window.FileTransfer();
				t.upload(
					url,
					'https://www.multibaseit.com.au/ca/image.aspx',
					function(result){
						carersApp.processUploadResult(result);
					},
					function(error){
						carersApp.processUploadFailure(error);
					},
					o
				);
			}
			else carersApp.processQueue();
		},
	//Process image upload success
		processUploadResult:function(result){
			var a=
				("Upload result code = "+result.responseCode)+
				("\nResponse = "+result.response)+
				("\nSent = "+result.bytesSent);
			//alert(a);
			carersApp.processQueue();
		},
	//Process image upload failure
		processUploadFailure:function(error){
			var a=
				("Upload error code = "+error.code)+
				("\nUpload error source = "+error.source)+
				("\nUpload error http status = "+error.http_status)+
				("\nUpload error body = "+error.body)+
				("\nUpload error exception = "+error.exception)+
				("\nUpload error target = "+error.target);
			//alert(a);
			carersApp.processQueue();
		}
};
document.addEventListener('deviceready',$(carersApp.initialise),false);