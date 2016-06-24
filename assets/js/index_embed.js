var nekowiz_events = [], nekowiz_weekly = [];
function init(){
    $.when(loadEvent())
    .then(function(events_s){
        nekowiz_events = parseData(events_s);
        startCalendar(nekowiz_events);
    });
}
function loadEvent(){
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
}
function parseData(data){
    var src, res = [];
    src = YAML.parse(data.query.pages[50134].revisions[0]['*']);
    for(var i in src){
        var start = moment(src[i].start), end = moment(src[i].end);
        if(moment(end).diff(moment(start)) < 86400000){
            res.push({
                title: src[i].title,
                url: "http://zh.nekowiz.wikia.com/wiki/活動任務/"+src[i].title,
                allDay: false,
                start: start.format(),
                end: end.format()
            });
        }else{
            res.push({
                title: src[i].title,
                url: "http://zh.nekowiz.wikia.com/wiki/活動任務/"+src[i].title,
                allDay: true,
                start: start.hour(0).format(),
                end: end.hour(24).format()
            });
        }
    }
    return res;
}
function startCalendar(events){
    $('#calendar').fullCalendar({
        lang: 'zh-tw',
        theme:false,
        editable: false,
        header: {
            left: 'prev,next',
            center: '',
            right: 'today'
        },
        views: {
            week: { // name of view
                columnFormat: 'ddd M/D'
                // displayEventEnd: true
                // other view-specific options here
            }
        },
        axisFormat: "HH:mm",
        scrollTime: moment.max(moment().startOf('day'), moment().subtract(3, 'hours')).format("HH:mm"),
        defaultView: 'basicWeek',
        timeFormat: 'HH:mm',
        eventLimit: true, // allow "more" link when too many events
        eventRender: function(event, element) {
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
                        console.log(start_m.format("HH:mm") + " ~ " + end_m.format("HH:mm"));
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
        viewRender: function (view) {},
        events: events
    });
    $('#calendar').fullCalendar( 'addEventSource', nekowiz_weekly );
}
$(document).ready(function() {
    init();
});