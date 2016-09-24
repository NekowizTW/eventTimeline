var nekowiz_events = [], nekowiz_weekly = [], nekowiz_zero = [];
function init(){
    $.when(loadEvent('weekly'), loadEvent('events'))
    .then(function(weekly_s, events_s){
        nekowiz_weekly = weekly_s[0];
        parseData(events_s[0]);
        startCalendar(nekowiz_events);
    });
}
function setTimeline(){
  if(jQuery(".timeline").length == 0){
      jQuery(".fc-time-grid-container").prepend("<div style='width:100%;overflow: visible;'><hr class='timeline'/></div>") 
    }
    var timeline = jQuery(".timeline");  

    if(jQuery(".fc-today").length <= 0){
        timeline.hide()
        return;
    }
    else{
      timeline.show()
    }

    var now = moment();
    var day = parseInt(now.format("e"));
    var width =  jQuery(".fc-minor").width();
    var height =  jQuery(".fc-today:last").height();
    var left = (day*width) + jQuery(".fc-axis").outerWidth()-1;
    var top = ( (now.hours()*3600)+(now.minutes()*60)+now.seconds() )/86400;

    top = height*top-2;
    timeline
    .css('width',width+"px")
    .css('top',top+"px") 
}
function dailyButton(){
    if($('#event-toggle-btn').length == 0){
        $('#calendar .fc-toolbar .fc-right').append('<button id="event-toggle-btn" class="fc-button fc-state-default fc-corner-left fc-corner-right" data-eventtype="daily" type="button">曜日</button>');
        $('#event-toggle-btn').bind('click', function(){
            switch($(this).data('eventtype')){
                case 'daily': 
                    $(this).text("活動");
                    $('#calendar').fullCalendar( 'removeEventSource', nekowiz_weekly );
                    $('#calendar').fullCalendar( 'changeView', 'basicWeek' );
                    $(this).data('eventtype', 'events');
                    break;
                case 'events':
                    $(this).text("曜日");
                    $('#calendar').fullCalendar( 'changeView', 'agendaDay' );
                    $('#calendar').fullCalendar( 'addEventSource', nekowiz_weekly );
                    $(this).data('eventtype', 'daily');
                    break;
                default:
            }
        });
    }
}
function zeroButton(){
    if($('#zero-toggle-btn').length == 0){
        $('#calendar .fc-toolbar .fc-right').append('<button id="zero-toggle-btn" class="fc-button fc-state-default fc-corner-left fc-corner-right" data-zerotype="events_only" type="button">只有活動</button>');
        $('#zero-toggle-btn').bind('click', function(){
            switch($(this).data('zerotype')){
                case 'zero_only':
                    $(this).text("只有活動");
                    $('#event-toggle-btn').show();
                    $('#event-toggle-btn').text("活動");
                    $('#event-toggle-btn').data('eventtype', 'events');
                    $('#calendar').fullCalendar( 'changeView', 'basicWeek' );
                    $('#calendar').fullCalendar( 'removeEventSource', nekowiz_zero );
                    $('#calendar').fullCalendar( 'addEventSource', nekowiz_events );
                    $(this).data('zerotype', 'events_only');
                    break;
                case 'events_only':
                    $(this).text("0體時段");
                    $('#event-toggle-btn').hide();
                    $('#calendar').fullCalendar( 'changeView', 'agendaWeek' );
                    $('#calendar').fullCalendar( 'removeEventSources' );
                    $('#calendar').fullCalendar( 'addEventSource', nekowiz_zero );
                    $(this).data('zerotype', 'zero_only');
                    break;
                default:
            }
        });
    }
}
function loadEvent(type){
    if(type === 'weekly'){
        return $.getJSON('./assets/json/weekly.json');
    }else if('events'){
        return $.ajax({
              url: "http://zh.nekowiz.wikia.com/api.php",
              crossDomain: true,
              dataType: "jsonp",
              data: {
                format: "json",
                action: "query",
                prop: "revisions",
                titles: "模板:Event_Timeline",
                rvprop: "content"
              }
            });
    }else return;
}
function parseData(data){
    var src, zeroFlag = false;
    src = jsyaml.load(data.query.pages[50134].revisions[0]['*']);
    src = src.sort(function(a, b){
        return moment(a.start) - moment(b.start);
    });
    for(var i in src){
        var start = moment(src[i].start), end = moment(src[i].end), now = moment(Date());
        if(moment(end).diff(moment(start)) < 86400000){
            if(now.isBefore(end)) zeroFlag = true;
            nekowiz_zero.push({
                title: src[i].title,
                url: "http://zh.nekowiz.wikia.com/wiki/活動任務/"+src[i].title,
                allDay: false,
                start: start.format(),
                end: end.format(),
                className: "zeroEvent-"+src[i].color
            });
        }else{
            nekowiz_events.push({
                title: src[i].title,
                url: "http://zh.nekowiz.wikia.com/wiki/活動任務/"+src[i].title,
                allDay: true,
                start: start.hour(0).format(),
                end: end.hour(24).format()
            });
        }
    }
    if(!zeroFlag) nekowiz_zero = [];
}
function startCalendar(events){
    if(nekowiz_zero.length > 0) zeroNotify();
    $('#calendar').fullCalendar({
        lang: 'zh-tw',
        theme:false,
        editable: false,
        height: 650,
        header: {
            left: 'prev,next today',
            center: 'title',
            right: ''
        },
        views: {
            month: { // name of view
                titleFormat: 'YYYY 年 MM 月'
                // displayEventEnd: true
                // other view-specific options here
            }
        },
        axisFormat: "HH:mm",
        scrollTime: moment.max(moment().startOf('day'), moment().subtract(3, 'hours')).format("HH:mm"),
        defaultView: 'agendaDay',
        timeFormat: 'HH:mm',
        eventLimit: true, // allow "more" link when too many events
        eventRender: function(event, element, view) {
            if(view.name === 'basicDay' || view.name === 'basicWeek') {
                $(element).height(30);
            }
            element.qtip({
                position: {
                    my: 'top left',
                    at: 'bottom right',
                    target: 'mouse',
                    adjust: {x:15, y:15}
                },
                content: {
                    text: function (e) {
                        var start_m = moment(event.start);
                        var end_m = moment(event.end);
                        // check same day
                        var is_same_day = ((start_m.dayOfYear() == end_m.dayOfYear()) && (start_m.year() == end_m.year()));
                        // check all day
                        if (start_m.hour() == 0 && start_m.minute() == 0 && end_m.hour() == 0 && end_m.minute() == 0) {
                            if (end_m.diff(start_m, 'days') == 1) {
                                return start_m.format("MM月DD日");
                            } else {
                                return start_m.format("MM月DD日") + " ~ " + end_m.format("MM月DD日");
                            }
                        } else {
                            if (is_same_day) {
                                return start_m.format("HH:mm") + " ~ " + end_m.format("HH:mm");
                            } else {
                                return start_m.format("MM月DD日 HH:mm") + " ~ " + end_m.format("MM月DD日 HH:mm");
                            }
                        }
                    },
                    title: event.title
                },
                style: {
                    classes: 'qtip-rounded qtip-shadow'
                }
            });
        },
        style: {
            classes: 'qtip-blue qtip-shadow'
        },
        viewRender: function (view) {
            try {
                setTimeline();
                dailyButton();
                if(nekowiz_zero.length > 0){
                    zeroButton();
                }
            } catch (err) {}
        },
        events: events
    });
    $('#calendar').fullCalendar( 'addEventSource', nekowiz_weekly );
}
function zeroNotify(){
    console.log('notify_pass');
    var now = moment();
    if(nekowiz_zero.length == 0) return;
    for(var i = 0; i < nekowiz_zero.length; i++){
        if(moment(nekowiz_zero[i].end) > now){
            if(moment(nekowiz_zero[i].start) < now){
                $('#zeroNotify').append(
                    '<a class="pure-g" href='+nekowiz_zero[i].url+'>'
                    +'<p class="pure-u-1">'+'目前0體時段: '+moment(nekowiz_zero[i].start).format('MM月DD日 HH:mm')+'~'+moment(nekowiz_zero[i].end).format('HH:mm')+'</p>'
                    +'<img class="pure-u-1 pure-img" src="./assets/images/'+nekowiz_zero[i].title+'.png">'
                    +'</a>'
                );
                if(nekowiz_zero.length - i > 1)i++;
                else break;
            }
            $('#zeroNotify').append(
                '<a class="pure-g" href='+nekowiz_zero[i].url+'>'
                +'<p class="pure-u-1">'+'下一個0體時段: '+moment(nekowiz_zero[i].start).format('MM月DD日 HH:mm')+'~'+moment(nekowiz_zero[i].end).format('HH:mm')+'</p>'
                +'<img class="pure-u-1 pure-img" src="./assets/images/'+nekowiz_zero[i].title+'.png">'
                +'</a>'
            );
            break;
        }
    }
}
function displayTime() {
    var time = moment().format('MM月DD日 HH:mm:ss');
    $('#clock').html('現在時間：'+time+'');
    setTimeout(displayTime, 1000);
}
$(document).ready(function() {
    init();
    displayTime();
});