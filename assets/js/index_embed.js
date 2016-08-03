var nekowiz_events = [], nekowiz_weekly = [];
function Event_Timer(event){
    this.id = guidGenerator();
    var id = this.id;
    this.started = Date.now()>Date.parse(event.start)? true:false;
    var started = this.started;
    this.target_date = this.started? (new Date(event.end)):(new Date(event.start));
    this.current_date = new Date();
    this.count = new Countdown(this.target_date, this.current_date);
    this.title = event.title;
    var str = '<a target="_blank" href="http://zh.nekowiz.wikia.com/wiki/%E6%B4%BB%E5%8B%95%E4%BB%BB%E5%8B%99/'+this.title+'"><div class="quest"><p>'+this.title+'</p><div id="'+this.id+'"></div></div></a>';
    $('#calendar').prepend(str);
    this.count.countdown(function(obj) {
        //Do anything you want with the obj, which contains days, hours, minutes, seconds
        //This will be called every one second as the countdown timer goes
        // console.debug(obj);
        var str = started? "結束":"開始"
        //E.g. you might use jQuery to update the countdown
        $('#'+id).text("將於"+obj.days+"天"+obj.hours+"時"+obj.minutes+"分"+obj.seconds+"秒後"+str);
    });
}

function init(){
    $.when(loadEvent())
    .then(function(events_s){
        nekowiz_events = parseData(events_s);
        startCalendar(nekowiz_events);
    });
}
function guidGenerator() {
    var S4 = function() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
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
    src = jsyaml.load(data.query.pages[50134].revisions[0]['*']);
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
    var timer = new Array(events.length);
    for (var i = events.length - 1; i >= 0; i--) {
        timer[i] = new Event_Timer(events[i]);
    }
}
$(document).ready(function() {
    init();
});