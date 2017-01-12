var App={
	
	
	
	//INITIALISATION
	
	//Function customisations
	/*
	initialise
	handleBackButton
	authenticateLogin
	loadListData
	buildList
	buildForm
	addFormItems
	submitForm
	validateForm
	processQueue
	uploadImageFile
	*/
	
	//Local storage name prefix
		prefix:'ca',
		
	//Data lifetime value (ms)
		timeout:3600000,
	
	//Persistent variables
		data:{
			list:{},
			clock:{},
			signature:{},
			photo:{},
			map:{},
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
		
	//Text strings for prompts and alerts
		message:{
			logOutPrompt:'You will be logged out',
			invalidLogin:'Please enter a valid username and password',
			offlineUpdate:'Your roster will be updated next time your device is online',
			itemCompleted:'This appointment has been completed',
			noItems:'You have no appointments scheduled',
			updateError:'Your roster could not be updated due to a server error',
			noMapAvailable:'Maps are not available for this appointment',
			noGeolocation:'Maps cannot be used offline or if location services are unavailable',
			googleError:'An error has occurred at Google Maps',
			locationError:'Your location cannot be determined',
			noCamera:'No camera is available',
			cancelForm:'Information you have entered for this appointment will be discarded',
			incompleteForm:'Please complete this form before saving',
			clockValidation:'The start time must be earlier than the finish time'
		},
	
	//Initialise application
		initialise:function(){
			//iOS stylesheet
				if(/constructor/i.test(window.HTMLElement))$('body').addClass('ios');
				else if(window.StatusBar)StatusBar.overlaysWebView(false);
			//HTML templates
				App.template.rosterItem=$('.list_items').html().replace(/\t|\r|\n/gi,'');
				App.template.itemForm=$('.item_form').html().replace(/\t|\r|\n/gi,'');
				App.template.noteItem=$('.note_list').html().replace(/\t|\r|\n/gi,'');
				App.template.signaturePanel=$('.signature_layout').html().replace(/\t|\r|\n/gi,'');
				App.template.directionStep=$('.directions_list').html().replace(/\t|\r|\n/gi,'');
			//Login form handler
				$('.login_form').on('submit',App.submitLogin);
			//First page
				App.showPage('.login_page');
				//App.loadListData();
				//App.buildForm(0);
		},
	
	
	
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
			if(window.navigator.vibrate&&type=='error')window.navigator.vibrate(200);
			$('.error_page').removeClass('error confirm warning notification').addClass(type+' active_overlay').fadeIn(function(){
				if(typeof process=='function'&&type!='confirm')(process)();
				$(this).find('.close_button, .confirm_no').off().on('click',function(){
					$('.error_page').removeClass('active_overlay').fadeOut();
				});
				$(this).find('.confirm_yes').off().on('click',function(){
					(process)();
					$('.error_page').removeClass('active_overlay').fadeOut();
				});
			});
		},

	//Show and hide form overlay
		showFormOverlay:function(overlay,process){
			$('body').addClass('no_scroll');
			$(overlay).addClass('active_overlay').fadeIn(function(){
				if(typeof process=='function')(process)();
			});
		},
		hideFormOverlay:function(process){
			if(typeof process=='function')(process)();
			$('body').removeClass('no_scroll');
			$('.active_overlay').removeClass('active_overlay').fadeOut(function(){
				$('.overlay_icon').removeClass('loading');
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
		
	//Generate natural language last update string from timestamp
		lastUpdateText:function(timestamp){
			var t=new Date().getTime(),
				m=Math.floor((t-timestamp)/60000),
				h=Math.floor((t-timestamp)/3600000),
				d=Math.floor((t-timestamp)/86400000),
				u='a few seconds ago';
			if(d>0)u=(d==1)?'yesterday':d+' days ago';
			else if(h>0)u=h+' hour'+((h>1)?'s':'')+' ago';
			else if(m>0)u=m+' minute'+((m>1)?'s':'')+' ago';
			return u;
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
			if($('.list_page').hasClass('active_page')){
				App.showMessage('confirm',App.message.logOutPrompt,App.logOut);
				return true;
			}
			if($('.form_page').hasClass('active_page')){
				App.cancelForm();
				return true;
			}
		},
	
	
	
	//LOGIN PAGE
	
	//Submit login form
		submitLogin:function(){
			var fail=false;
			if(!$('#user').val()||!$('#pass').val())fail=true;
			else{
				if(App.authenticateLogin()==true)App.loadListData();
				else fail=true;
			}
			if(fail)App.showMessage('error',App.message.invalidLogin);
			return false;
		},
		
	//Check login credentials
		authenticateLogin:function(){
			return true;
		},
	
	//Log out
		logOut:function(){
			App.showPage('.login_page',0);
		},
	
	
	
	//LIST PAGE
	
	//Load list data from server
	loadListData:function(force){
		if(window.navigator.onLine==true){
			if(new Date().getTime()>parseInt(window.localStorage.getItem(App.prefix+'-update-time'))+App.timeout||
				window.localStorage.getItem(App.prefix+'-update-time')==null||
				window.localStorage.getItem(App.prefix+'-data')==null||
				force==true){
					$.ajax({
						url:'https://www.multibaseit.com.au/ca/roster.aspx',
						dataType:'json',
						crossDomain:true,
						data:{
							time:new Date().getTime(),
							method:'get_roster',
							carer_id:'1'
						},
						timeout:10000,
						success:function(data,status,request){
							App.storeLocalData(data);
						},
						error:function(request,status,error){
							App.showServerError(request,status,error);
						}
					});
			}
			else App.buildList();
		}
		else{
			if(!$('.error_page').hasClass('active_overlay'))App.showMessage('warning',App.message.offlineUpdate,App.buildList);
			else App.buildList();
		}
	},
		
	//Store loaded list data 
		storeLocalData:function(data){
			window.localStorage.setItem(App.prefix+'-data',JSON.stringify(data));
			window.localStorage.setItem(App.prefix+'-update-time',new Date().getTime());
			App.buildList();
		},
		
	//Generate list HTML
		buildList:function(){
			var l=JSON.parse(window.localStorage.getItem(App.prefix+'-data'));
			if(!$.isEmptyObject(l)){
				var i=0,s,h=[],p,d,n=new Date();
				n.setHours(0);
				n.setMinutes(0);
				n.setSeconds(0);
				while(i<Object.keys(l).length){
					d=App.processDate(l[i].date);
					if(d.time>n.getTime()){
						c=(l[i].itemStatus)?' '+l[i].itemStatus.toLowerCase():'';
						s=App.template.rosterItem.split('-data-');
						h.push(
							s[0]+((p!=d.dd)?'item_divider':'')+c+
							s[1]+i+
							s[2]+l[i].geocode+
							s[3]+d.dayFormat+
							s[4]+d.shortDateFormat+
							s[5]+l[i].startTime+
							s[6]+l[i].finishTime+
							s[7]+l[i].clientFirstName+
							s[8]+l[i].clientLastName+
							s[9]+l[i].clientStreet+
							s[10]+l[i].clientSuburb+
							s[11]+l[i].serviceDescription+
							s[12]
						);
					}
					i++;
					p=d.dd;
				}
				$('.list_items').fadeIn().removeClass('filtered').html(h.join(''));
			//Bind events for list items
				$('.list_items .list_item').not('.pending,.submitted').each(function(){
					$(this).off().on('click',function(){
						App.buildForm($(this).attr('data-item-index'));
					});
					$(this).find('.item_map_link').off().on('click',function(){
						event.stopPropagation();
						App.validateMapData($(this).parent().attr('data-item-geocode'));
					});
				});
				$('.list_item.pending, .list_item.submitted').each(function(){
					$(this).off().on('click',function(){
						App.showMessage('error',App.message.itemCompleted);
					});
				});
			//Initialise list search
				$('#search_value').val('');
				$('.search_clear').hide();	
				$('.search_form').on('submit',function(){
					$('#search_value').blur();
					return false;
				});
				$('#search_value').off().on('input',App.filterList).val('');
				$('.search_clear').off().on('click',function(){
					$('#search_value').val('');
					App.filterList();
				});
			//Display list update time
				$('.list_update').off().on('click',App.forceListLoad);
				App.updateTime();
				$('.list_update .fa').removeClass('fa-spin');
				App.data.list.timer=setInterval(App.updateTime,60000);
			//Bind close button event
				$('.list_page > .close_button').off().on('click',function(){
					App.showMessage('confirm',App.message.logOutPrompt,App.logOut);
				});
			//Bind list toggle event
				$('.list_toggle').off().on('click',function(){
					if($('.list_item.pending,.list_item.submitted')[0]){
						App.data.list.toggled=!App.data.list.toggled;
						App.toggleList();
					}
				});
				App.toggleList();
			//Display list page
				if(!$('.list_page').hasClass('active_page')){
					if($('.error_page').hasClass('active_overlay'))App.showPage('.list_page',0);
					else App.showPage('.list_page');
				}
			//Trigger queued form process
				App.processQueue();
			}
			else if(!$('.error_page').hasClass('active_overlay'))App.showMessage('warning',App.message.noItems);
		},
		
	//Display last update time
		updateTime:function(){
			$('.update_time').html(App.lastUpdateText(parseInt(window.localStorage.getItem(App.prefix+'-update-time'))));
		},
		
	//Display server error message
		showServerError:function(request,status,error){
			var a=
				("Request = "+request.responseText)+
				("\nStatus = "+status)+
				("\nError = "+error);
			//alert(a);
			App.showMessage('error',App.message.updateError,App.buildList);
		},
		
	//Force reload from server
		forceListLoad:function(){
			if(window.navigator.onLine==true){
				$('.list_items').fadeOut();
				$('.list_update .fa').addClass('fa-spin');
				App.loadListData(true);
			}
			else App.showMessage('error',App.message.offlineUpdate);
		},
		
	//Search(filter) list
		filterList:function(){
			var s=$('#search_value')[0].value.trim().toLowerCase();
			if(s.length>1){
				$('.list_items').addClass('filtered');
				var c;
				$('.list_item').each(function(){
					if($(this).hasClass('item_divider'))c=1;
					if($(this).text().toLowerCase().indexOf(s)>-1){
						$(this).addClass('filtered');
						if(c==1){
							$(this).addClass('filtered_divider');
							c=0;
						}
					}
					else $(this).removeClass('filtered filtered_divider no_border');
				});
				$('.search_clear').show();
			}
			else{
				$('.list_items').removeClass('filtered');
				$('.list_item').removeClass('filtered filtered_divider no_border');
				$('.search_clear').hide();
			}
			$('.list_item:visible').first().addClass('no_border');
		},
		
	//Validate map data
		validateMapData:function(destination){
			if(window.navigator.onLine==false||typeof window.navigator.geolocation!=='object'){
				App.showMessage('error',App.message.noGeolocation);
				return;
			}
			var s=destination.split(',');
			if(isNaN(s[0])||isNaN(s[1])){
				App.showMessage('error',App.message.noMapAvailable);
				return;
			}
			else{
				App.data.map.destination=destination;
				App.showMapPanel();
			}
		},
		
	//Show and hide map overlay
		showMapPanel:function(){
			$('#map_inner').empty();
			$('.map_icon').addClass('loading');
			$('.active_overlay').removeClass('active_overlay').hide();
			$('.map_page').addClass('active_overlay').fadeIn();
			$('body').addClass('no_scroll');
			$('.map_page .close_button').off().on('click',App.hideMapPanel);
			if(typeof google==='undefined'||typeof google.maps==='undefined'){
				$('body').append('<script type="text/javascript" src="'+$('#google_script').attr('data-src')+'"></script>');
				App.verifyMapScript();
			}
			else App.getGeocode(App.initialiseMap);
		},
		hideMapPanel:function(){
			$('.map_page').removeClass('active_overlay').fadeOut(function(){
				$('body').removeClass('no_scroll');
				$('.map_icon').removeClass('loading');
				$('.map_text_link,.map_directions').hide().removeClass('active');
			});
		},
		
	//Reload Google scripts if unavailable
		verifyMapScript:function(){
			if(typeof google==='object'&&typeof google.maps==='object'){
				App.getGeocode(App.initialiseMap);
			}
			else window.setTimeout(App.verifyMapScript,500);
		},
		
	//Initialise map for directions
		initialiseMap:function(){
			if(!new RegExp('error','gi').test(App.data.map.origin)){
				a=App.data.map.origin.split(',');
				b=App.data.map.destination.split(',');
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
						$('.map_text_link').show().addClass('active');
						var m=new google.maps.Map($('#map_inner')[0],{
								disableDefaultUI:true,
								zoomControl:true,
								streetViewControl:true
							}),
							g=new google.maps.DirectionsRenderer();
						g.setDirections(response);
						g.setMap(m);
						App.getTextDirections(response.routes[0].legs[0]);
					}
					else if($('.map_page.active_overlay')[0])App.showMessage('error',App.message.googleError,App.hideMapPanel);
				});
			}
			else if($('.map_page').hasClass('active_overlay'))App.showMessage('error',App.message.noGeolocation,App.hideMapPanel);
		},
		
	//Get text directions from map result
		getTextDirections:function(directions){
			var h=[],a=App.template.directionStep.split('-data-');
			h.push(
				a[0]+directions.distance.text+' ('+directions.duration.text+')'+
				a[1]+
				a[2]
			);
			for(s in directions.steps){
				h.push(
					a[0]+directions.steps[s].instructions+
					a[1]+directions.steps[s].distance.text+
					a[2]
				)
			}
			$('.directions_list').html(h.join(''));
			$('.map_text_link').off().on('click',function(){
				$(this).toggleClass('active');
				if($(this).hasClass('active'))$('.map_directions').fadeOut();
				else $('.map_directions').fadeIn().scrollTop(0);
			});
		},
		
	//Get geocode from device
		getGeocode:function(process){
			if(typeof window.navigator.geolocation==='object'){
				window.navigator.geolocation.getCurrentPosition(
					function(position){
						App.data.map.origin=position.coords.latitude+','+position.coords.longitude;
						if(typeof process=='function')(process)();
					},
					function(error){
						App.data.map.origin='Error: '+error.message;
						if(typeof process=='function')(process)();
					},
					{
						timeout:20000
					}
				);
			}
			else App.showMessage('error',App.message.locationError);
		},
		
	//Add geocode value to form
		setGeocodeFormValue:function(){
			$('#form_geocode_value').val(App.data.map.origin);
			$('.location_check').hide();
			if(App.data.map.origin.indexOf('Error')==0)$('.location_error').show();
			else $('.location_captured').show();
		},
		
	//Toggle submitted list items
		toggleList:function(){
			if(App.data.list.toggled==true){
				$('.list_page').addClass('list_toggled');
				var c;
				$('.list_item').each(function(){
					if($(this).hasClass('item_divider'))c=1;
					if(!$(this).hasClass('submitted')&&!$(this).hasClass('pending')&&c==1){
						$(this).addClass('toggled_divider');
						c=0;
					}
					else $(this).removeClass('toggled_divider no_border');
				});
			}
			else{
				$('.list_page').removeClass('list_toggled');
				$('.list_item').removeClass('toggled_divider no_border');
			}
			if($('.list_item.pending,.list_item.submitted')[0])$('.list_toggle').removeClass('inactive');
			else $('.list_toggle').addClass('inactive');
			$('.list_item:visible').first().addClass('no_border');
		},
	
	
	
	//FORM PAGE
	
	//Generate item form
		buildForm:function(id){
			var f=JSON.parse(window.localStorage.getItem(App.prefix+'-data'))[id],
			s=App.template.itemForm.split('-data-'),
			d=App.processDate(f.date);
			h=[];
			h.push(
				s[0]+f.clientFirstName+
				s[1]+f.clientLastName+
				s[2]+d.dateFormat+
				s[3]+f.startTime+
				s[4]+f.finishTime+
				s[5]+f.serviceDescription+
				s[6]
			);
			$('.item_form').html(h.join(''));
		//Bind events for clock overlay
			/*Option: populate start and finish time from loaded data
				var asv=App.processDate(f.date);
					asv.setHours(parseInt(f.startTime));
					asv.setMinutes(f.startTime.substring(f.startTime.indexOf(':')+1));
					asv.setSeconds(0);
				$('#form_start_value').val(asv.getTime());
				var afv=App.processDate(f.date);
					afv.setHours(parseInt(f.finishTime));
					afv.setMinutes(f.finishTime.substring(f.finishTime.indexOf(':')+1));
					afv.setSeconds(0);
				$('#form_finish_value').val(afv.getTime());*/
			$('.form_page .form_start').off().on('click',function(){
				App.data.clock.active=$(this);
				App.initialiseClockOverlay($('#form_start_value').val());
			});
			$('.form_page .form_finish').off().on('click',function(){
				App.data.clock.active=$(this);
				App.initialiseClockOverlay($('#form_finish_value').val());
			});
			$('.clock_split_24').off().on('click',function(){
				App.setClockSplit(24,$(this));
			});
			$('.clock_split_12').off().on('click',function(){
				App.setClockSplit(12,$(this));
			});
			$('.clock_split_icon').off().on('click',function(){
				if($('.clock_split_12.split_active')[0])App.setClockSplit(24,$('.clock_split_24'));
				else App.setClockSplit(12,$('.clock_split_12'));
			});
			$('.clock_number').each(function(){
				$(this).off().on('click',function(){
					$(this).addClass('number_active').siblings().removeClass('number_active');
					App.setClockTime($(this));
				});
			});
		//Bind events for travel panel
			$('.form_page .form_travel').off().on('click',function(){
				App.initialiseTravelOverlay();
			});
			$('.slider_handle').draggable({
				containment:'parent',
				axis:'y',
				start:function(){
					$('.slider_handle').addClass('active');
				},
				drag:App.setSliderValue,
				stop:function(){
					if($('.display_km').html()=='0')$(this).removeClass('active');
				}
			});
			$('.slider_track').off().on('click',App.jumpSlider);
		//Bind events for note panel
			$('.form_notes textarea').on('focus',function(){
				$(this).parent().addClass('active');
			});
			$('.form_notes textarea').on('blur',function(){
				$(this).parent().removeClass('active');
			});
			$('.note_add').off().on('click',function(){
				App.initialiseNoteOverlay();
			});
		//Bind events for signature panel
			$('.form_sign').off().on('click',function(){
				App.showSignaturePanel();
			});
			$('.signature_clear').off().on('click',function(){
				App.clearSignaturePanel();
			});
		//Bind camera events
			$('.form_photo').on('click',App.openCamera);
			$('.photo_clear').off().on('click',function(){
				App.clearPhotoPanel();
			});
		//Populate static form data
			App.getGeocode(App.setGeocodeFormValue);
			$('#form_index_value').val(id);
		//Bind form + submit events
			$('.item_form').on('submit',function(){
				return false;
			});
			$('#form_submit').off().on('click',App.submitForm);
			$('.form_page > .close_button').off().on('click',App.cancelForm);
		//Display form page
			App.showPage('.form_page');
		},
	
	//Initialise clock overlay
		initialiseClockOverlay:function(timestamp){
			$('.active_overlay').removeClass('active_overlay').hide();
			$('.clock_page .close_button').off().on('click',function(){
				if(App.validateClockTime()==true){
					App.hideFormOverlay(function(){
						$(App.data.clock.active).find('label > span').html($('.clock_hours .number_active .split_active').text()+':'+$('.clock_mins .number_active').text());
						$(App.data.clock.active).addClass('completed');
					});
				}
				else App.showMessage('error',App.message.clockValidation);
			});
			$('.split_active').removeClass('split_active');
			$('.number_active').removeClass('number_active');	
			if(!timestamp){
				var t=new Date();
					t.setMinutes(Math.round(t.getMinutes()/5)*5);
				timestamp=t.getTime();
			}
			var d=new Date(parseInt(timestamp));
				d.setMinutes(Math.round(d.getMinutes()/5)*5);
			App.data.clock.time=parseInt(timestamp);
			if(d.getHours()==0){
				$('.clock_hours .clock_0').addClass('number_active');
				App.setClockSplit(24);
			}
			else if(d.getHours()<12){
				$('.clock_hours .clock_'+(d.getHours())).addClass('number_active');
				App.setClockSplit(12);
			}
			else if(d.getHours()==12){
				$('.clock_hours .clock_0').addClass('number_active');
				App.setClockSplit(12);
			}
			else if(d.getHours()>12){
				$('.clock_hours .clock_'+(d.getHours()-12)).addClass('number_active');
				App.setClockSplit(24);
			}
			$('.clock_mins .clock_'+(d.getMinutes()/5)).addClass('number_active');
			App.setClockTime();
			$('.clock_page').addClass('active_overlay').fadeIn();
		},
	
	//Validate start and finish times for clock overlay
		validateClockTime:function(){
			if(!$('#form_start_value').val()||!$('#form_finish_value').val())return true;
			if(new Date(parseInt($('#form_finish_value').val()))>new Date(parseInt($('#form_start_value').val())))return true;
			else return false;
		},
		
	//Toggle AM and PM for clock overlay
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
			if(element)App.setClockTime();
		},
		
	//Set selected time for clock overlay
		setClockTime:function(){
			var d=new Date(App.data.clock.time);
				d.setHours(parseInt($('.clock_hours .number_active .split_active').text()));
				d.setMinutes(parseInt($('.clock_mins .number_active').text()));
			$('.clock_hand_hours').css('transform','rotate('+(($('.clock_hours .number_active').index()*30)-90)+'deg)');
			$('.clock_hand_mins').css('transform','rotate('+(($('.clock_mins .number_active').index()*30)-90)+'deg)');
			App.data.clock.time=d.getTime();
			$(App.data.clock.active).find('input').val(d.getTime());
			App.setDisplayTime();
		},
		
	//Set text display for clock overlay
		setDisplayTime:function(){
			$('.display_hours').html($('.clock_hours .number_active .split_active').text());
			$('.display_mins').html($('.clock_mins .number_active').text());
		},
	
	//Initialise travel overlay
		initialiseTravelOverlay:function(){
			$('.active_overlay').removeClass('active_overlay').hide();
			if($('#form_travel_value').val()==0)App.resetSlider();
			$('.travel_page .close_button').off().on('click',function(){
				App.hideFormOverlay(function(){
					$('.form_travel label > span').html($('.display_km').text());
					$('#form_travel_value').val($('.display_km').text());
					if(parseInt($('#form_travel_value').val())!=0)$('.form_travel').addClass('completed');
				});
			});
			$('.travel_page').addClass('active_overlay').fadeIn();
		},
		
	//Reset slider for new form
		resetSlider:function(){
			$('.slider_handle').removeClass('active').css({'bottom':'0','top':'auto'});
			$('.display_km').html('0');
		},
		
	//Display slider value for travel overlay
		setSliderValue:function(){
			$('.display_km').html(Math.round(($('.slider_handle').position().top/($('.form_slider').height()-$('.slider_handle').height()))*-100)+100);
		},
		
	//Jump slider to mouse click for travel overlay
		jumpSlider:function(reset){
			var t=Math.max(0,Math.min((event.pageY-$(this).offset().top)-$('.slider_handle').height()/2,$('.slider_track').height()-$('.slider_handle').height()));
			$('.slider_handle').css('top',t);
			if(t<$('.slider_track').height()-$('.slider_handle').height())$('.slider_handle').addClass('active');
			else $('.slider_handle').removeClass('active');
			App.setSliderValue();
		},
	
	//Initialise note panel
		initialiseNoteOverlay:function(){
			$('.active_overlay').removeClass('active_overlay').hide();
			$('.note_page .close_button').off().on('click',function(){
				App.hideFormOverlay(function(){
					App.addNoteText();
					$('#form_notes_value').blur();
				});
			});
			var i=0,h=[],
				s=App.template.noteItem.split('-data-');
			while(i<App.data.notes.length){
				h.push(
					s[0]+App.data.notes[i]+
					s[1]
				);
				i++;
			}
			$('.note_list').html(h.join(''));
			$('.note_list li').each(function(){
				if($('#form_notes_value').val().indexOf($(this).find('.note_text').text())>-1)$(this).addClass('active');
				$(this).off().on('click',function(){
					$(this).toggleClass('active');
				});
			});
			$('.note_page').addClass('active_overlay').fadeIn();
		},
		
	//Process selected note text
		addNoteText:function(){
			var t=$('#form_notes_value').val();
			$('.note_text').each(function(){
				if($(this).parent().hasClass('active')&&t.indexOf($(this).text())<0)t+=(' '+$(this).text()+' ');
				if(!$(this).parent().hasClass('active')&&t.indexOf($(this).text())>-1)t=t.replace($(this).text(),'');
			});
			$('#form_notes_value').val(t.replace(/\s{2,}/gi,' ').trim());
		},
	
	//Show signature overlay - https://github.com/szimek/signature_pad
		showSignaturePanel:function(){
			$('.active_overlay').removeClass('active_overlay').hide();
			$('.signature_page .close_button').off().on('click',function(){
				$('.signature_page').fadeOut(function(){
					if(!App.data.signature.canvas.isEmpty()){
						$('#form_sign_value').val(App.data.signature.canvas.toDataURL());
						App.data.signature.canvas.clear();
						$('#form_sign_value').parent().addClass('completed');
					}
					else{
						$('#form_sign_value').val('');
						$('#form_sign_value').parent().removeClass('completed');
					}
				});
			});
			App.initialiseSignaturePanel();
			$('.signature_page').addClass('active_overlay').fadeIn();
		},
		
	//Resize signature canvas element
		initialiseSignaturePanel:function(){
			App.data.signature.canvas=document.querySelector('canvas#signature_image');
			var r=Math.max(window.devicePixelRatio||1,1);
			$(App.data.signature.canvas).width($(document).width())*r;
			$(App.data.signature.canvas).height($(document).height())*r;
			App.data.signature.canvas.width=$(document).width()*r;
			App.data.signature.canvas.height=$(document).height()*r;
			App.data.signature.canvas.getContext("2d").scale(r,r);
			App.data.signature.canvas=new SignaturePad(App.data.signature.canvas);
			if($('#form_sign_value').val()!='')App.data.signature.canvas.fromDataURL($('#form_sign_value').val());
		},
		
	//Clear signature panel
		clearSignaturePanel:function(){
			App.data.signature.canvas.clear();
		},
		
	//Open camera for form
		openCamera:function(){
			if(window.navigator.camera&&$('#form_photo_value').val()=='No photo captured'){
				window.navigator.camera.getPicture(
					function(filename){
						App.showCameraPanel(filename);
					},
					function(error){
						App.showMessage('error',error);
						$('#form_photo_button').parent().removeClass('completed');
					},
					{
						quality:50,
						destinationType:Camera.DestinationType.FILE_URI,
						correctOrientation:true,
						saveToPhotoAlbum:false
					}
				);
			}
			else if(window.navigator.camera&&$('#form_photo_value').val()!='No photo captured'){
				App.showCameraPanel($('#form_photo_value').val());
			}
			else App.showMessage('error',App.message.noCamera);
			//else App.showCameraPanel();
		},
		
	//Show camera panel for photo annotation
		showCameraPanel:function(filename){
			if(filename){
				$('#form_photo_value').val(filename);
				$('#form_photo_value').parent().addClass('completed');
			}
			if(!$('.photo_page').hasClass('active_overlay'))$('.active_overlay').removeClass('active_overlay').hide();
			if($('#form_photo_value').val()!='No photo captured')$('.photo_layout').css('background-image','url(\''+$('#form_photo_value').val()+'\')');
			$('.photo_page .close_button').off().on('click',function(){
				$('.photo_page').fadeOut(function(){
					if(!App.data.photo.canvas.isEmpty()){
						$('#form_annotation_value').val(App.data.photo.canvas.toDataURL());
						App.data.photo.canvas.clear();
					}
					else $('#form_annotation_value').val('No annotation entered');
				});
			});
			App.initialisePhotoPanel();
			$('.photo_page').addClass('active_overlay').fadeIn();
		},
		
	//Resize photo canvas element
		initialisePhotoPanel:function(){
			App.data.photo.canvas=document.querySelector('canvas#photo_image');
			var r=Math.max(window.devicePixelRatio||1,1);
			$(App.data.photo.canvas).width($(document).width())*r;
			$(App.data.photo.canvas).height($(document).height())*r;
			App.data.photo.canvas.width=$(document).width()*r;
			App.data.photo.canvas.height=$(document).height()*r;
			App.data.photo.canvas.getContext("2d").scale(r,r);
			App.data.photo.canvas=new SignaturePad(App.data.photo.canvas);
			App.data.photo.canvas.penColor='yellow';
			if($('#form_annotation_value').val()!='No annotation entered')App.data.photo.canvas.fromDataURL($('#form_annotation_value').val());
		},
		
	//Clear photo panel
		clearPhotoPanel:function(){
			App.data.photo.canvas.clear();
			$('#form_annotation_value').val('');
			$('#form_photo_value').val('No photo captured');
			$('.photo_layout').css('background-image','none')
			$('#form_photo_value').parent().removeClass('completed');
			App.openCamera();
		},
	
	//Submit form data
		submitForm:function(){
			if(App.validateForm()==true){
				$('#form_timestamp_value').val(new Date().getTime());
				var f={};
				$('.item_form input, .item_form textarea').not('input[type=submit], input[type=reset]').each(function(){
					f[$(this).attr('id')]=$(this).val();
				});
				App.addQueueItem(f);
			}
			else App.showMessage('error',App.message.incompleteForm);
			return false;
		},
		
	//Validate item form data before submission
		validateForm:function(){
			var i=0;
			$('.item_form .hidden_field[data-required=true]').each(function(){
				if($(this).val()=='')return false;
				i++;
			});
			if(i==$('.item_form .hidden_field[data-required=true]').length)return true;
			return false;
		},
		
	//Close item form screen (cancel form)
		cancelForm:function(){
			App.showMessage('confirm',App.message.cancelForm,function(){
				App.loadListData();
			});
		},
		
	//Add submission to processing queue and return to list page
		addQueueItem:function(item){
			var q;
			if(window.localStorage.getItem(App.prefix+'-queue')!=null){
				q=window.localStorage.getItem(App.prefix+'-queue').substring(0,window.localStorage.getItem(App.prefix+'-queue').lastIndexOf(']'))+','+JSON.stringify(item)+']';
			}
			else q='['+JSON.stringify(item)+']';
			window.localStorage.setItem(App.prefix+'-queue',q);
			App.updateItemStatus(item.form_index_value,'Pending',App.loadListData);
		},
		
	
	
	//FORM UPLOAD + QUEUE
	
	//Process form submission queue
		processQueue:function(){
			var q=$.makeArray(window.localStorage.getItem(App.prefix+'-queue'));
			if(q.length>0&&window.navigator.onLine==true){
				$.ajax({
					type:'POST',
					url:'https://www.multibaseit.com.au/ca/process.aspx',
					dataType:'json',
					crossDomain:true,
					data:q[0],
					processData:false,
					success:function(data,status,request){
						App.processQueueResponse();
					},
					error:function(request,status,error){
						App.showServerError(request,status,error);
					}
				});
			}
		},
		
	//Process response and remove item from queue
		processQueueResponse:function(){
			var a=JSON.parse(window.localStorage.getItem(App.prefix+'-queue'));
			var i=a.shift();
			if(a.length>0)window.localStorage.setItem(App.prefix+'-queue',JSON.stringify(a));
			else window.localStorage.removeItem(App.prefix+'-queue');
			App.updateItemStatus(i.form_index_value,'Submitted',function(){
				App.uploadImageFile(
					i.form_photo_value,
					i.form_index_value+'-'+i.form_timestamp_value
				);
			});
		},
		
	//Update item status in stored list data
		updateItemStatus:function(id,status,process){
			var q=JSON.parse(window.localStorage.getItem(App.prefix+'-data'));
			q[id].itemStatus=status;
			window.localStorage.setItem(App.prefix+'-data',JSON.stringify(q));
			$('.list_item[data-item-index='+(id)+']').removeClass('pending submitted').addClass(status.toLowerCase());
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
						App.processUploadResult(result);
					},
					function(error){
						App.processUploadFailure(error);
					},
					o
				);
			}
			else App.processQueue();
		},
		
	//Process image upload success
		processUploadResult:function(result){
			var a=
				("Upload result code = "+result.responseCode)+
				("\nResponse = "+result.response)+
				("\nSent = "+result.bytesSent);
			//alert(a);
			App.processQueue();
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
			App.processQueue();
		}
};



function addDeviceEvents(){
	//Device back button
		document.addEventListener('backbutton',App.handleBackButton,false);
	//Device connection state
		document.addEventListener('online',App.processQueue,false);
	//Application focus
		document.addEventListener('resume',App.updateTime,false);
	//Initialisation
		$(document).ready(App.initialise);
}
if(window.cordova)document.addEventListener('deviceready',addDeviceEvents,false);
else $(document).ready(App.initialise);
