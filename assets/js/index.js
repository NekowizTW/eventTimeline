// Add promise retry for api retry
Promise.retry = function (promiseFn, retry = 3) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            promiseFn().then(response => resolve(response))
                       .catch(err => retry === 0 ? Promise.retry(promiseFn, retry - 1) : reject(err));
        }, 1000);
    })
}

document.addEventListener('DOMContentLoaded', async () => {
    const calendar = createCalendar();
    await Promise.retry(fetchNormalQuests)
            .then(categories => generateNormalList(categories))
            .catch(err => console.error(err));
    await Promise.retry(fetchRawFromWiki)
            .then(raw => parseEventsFromRaw(raw))
            .then(events => events.map(reformatDates))
            .then(reformatEvents => calendar.addEventSource(reformatEvents))
            .catch(err => console.error(err));
    await Promise.retry(fetchListFromOfficial)
            .then(table => parseEventFromList(table))
            .then(events => events.map(reformatDates))
            .then(reformatEvents => calendar.addEventSource(reformatEvents))
            .catch(err => console.error(err));
});

function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

async function fetchNormalQuests () {
    const url = './assets/json/normalQuest.json';
    return fetch(url)
            .then(response => response.json())
}

function generateNormalList (categories) {
    console.log(categories);
    const target = document.getElementById('normalQuests');
    categories.forEach(category => {
        let container = document.createElement('div');
        container.className = 'pure-u-1 pure-u-md-1-2';
        let titleOfCont = document.createElement('h4');
        titleOfCont.innerText = category.name;
        container.appendChild(titleOfCont);

        category.quests
                .map(generateNormalQuest)
                .forEach(link => container.appendChild(link));

        target.appendChild(container);
    })
}

function generateNormalQuest (quest) {
    let link = document.createElement('a');
    let img  = document.createElement('img');
    link.href      = quest.url;
    link.target    = '_blank';
    link.className = 'imgBanner';
    img.src = `./assets/images/${quest.image}`;
    img.alt = quest.name;

    link.appendChild(img);
    return link;
}

async function fetchRawFromWiki () {
    const url = 'https://nekowiz.fandom.com/zh/api.php?format=json&action=query&prop=revisions&rvprop=content&rvslots=main&titles=活動任務';
    return fetchJsonp(url)
            .then(response => response.json())
            .then(data => data.query.pages['120'].revisions[0].slots.main['*'])
            .catch(err => '')
}

function parseEventsFromRaw (raw) {
    const lines = raw.split('\n');
    const re = /\[\[.*\|(.*)\]\]/;
    let events = [], inBracket = false;
    // console.log(raw)
    for (let idx = 0; idx < lines.length; idx += 1) {
        if (!inBracket && lines[idx].indexOf('{|') >= 0) {
            inBracket = true;
        } else if (inBracket && lines[idx].indexOf('|}') >= 0) {
            inBracket = false;
        } else if (inBracket && re.test(lines[idx])) {
            m = re.exec(lines[idx]);
            const title = m[1];
            const comment = lines[idx + 3].replace('\| ', '').replace(/(<([^>]+)>)/gi, '');
            const category = lines[idx].indexOf('分類:') >= 0 ? '分類:' : ''
            events.push({
                id: uuidv4(),
                groupId: `${comment}任務`,
                title: `${title}[${comment}]`,
                start: lines[idx + 1].replace('\| ', ''),
                end: lines[idx + 2].replace('\| ', ''),
                classNames: ['gameEvent', comment === '首開' ? 'primary' : 'secondary'],
                url: `https://nekowiz.fandom.com/zh/wiki/${category}活動任務/${title}`
            })
            idx += 5;
        }
    }
    // console.log(events);
    return events;
}

async function fetchListFromOfficial () {
    const url = 'https://sheets.googleapis.com/v4/spreadsheets/1EnhYixFAB3AtqdUDMvddoXDwlnQ_6MExQQKKbcJclIE/values/News?alt=json&key=AIzaSyCmgzVDKRAjurdUWchm8vyU02djl6w53XY';
    return fetch(url)
            .then(response => response.json())
            .then(data => data.values)
            .catch(err => [])
}

function parseEventFromList (table) {
    const re = /活動\d+\. .*【(.*)】.*/;
    const typeOfEvents = [
        { keyword: '登入獎勵', classNames: ['gameEvent', 'login']},
        { keyword: '轉蛋', classNames: ['gameGacha', 'gacha']},
        { keyword: '贈禮關卡', classNames: ['gameEvent', 'present']}
    ];
    return table.reduce((events, [url, content]) => {
        const lines = content.split('\n');

        for (let idx = 1; idx < lines.length; idx++) {
            if (!re.test(lines[idx])) continue;

            const m = re.exec(lines[idx]);
            if (events.find(o => o.title === m[1])) continue;

            const acceptedType = typeOfEvents.filter(type => m[1].indexOf(type.keyword) >= 0)
            if (acceptedType.length === 0) continue;

            // 活動時間：2021/10/21 15:00 ~ 2021/11/14 23:59
            const [start, end] = lines[idx + 1].replace('活動時間：', '').split('~')
            events.push({
                id: uuidv4(),
                groupId: acceptedType[0].keyword,
                title: m[1],
                start: start.trim().split(' ')[0],
                end: end.trim().split(' ')[0],
                classNames: acceptedType[0].classNames,
                url: `http://www.wiz.so-net.tw/${url}`
            })
        }
        return events;
    }, [])
}

function reformatDates (event) {
    const availableFormats = ['YYYY/MM/DD', 'YYYY/M/D'];
    event.start = moment(event.start, availableFormats).format('YYYY-MM-DD');
    event.end   = moment(event.end, availableFormats).format('YYYY-MM-DD');
    return event;
}

function createCalendar () {
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridWeek',
        locale: 'zh-TW',
        events: [],
        eventClick: function(info) {
            info.jsEvent.preventDefault(); // don't let the browser navigate

            if (info.event.url) {
                window.open(info.event.url, '_blank');
            }
        },
        customButtons: {
            showAll: {
                text: '顯示全部',
                click: function() {
                    document.querySelectorAll('.gameEvent').forEach(el => el.classList.remove('hide'));
                    document.querySelectorAll('.gameGacha').forEach(el => el.classList.remove('hide'));
                }
            },
            showEventOnly: {
                text: '只顯示活動',
                click: function() {
                    document.querySelectorAll('.gameEvent').forEach(el => el.classList.remove('hide'));
                    document.querySelectorAll('.gameGacha').forEach(el => el.classList.add('hide'));
                }
            },
            showGachaOnly: {
                text: '只顯示轉蛋',
                click: function() {
                    document.querySelectorAll('.gameEvent').forEach(el => el.classList.add('hide'));
                    document.querySelectorAll('.gameGacha').forEach(el => el.classList.remove('hide'));
                }
            }
        },
        headerToolbar: {
            left: 'showAll,showEventOnly,showGachaOnly',
            center: 'title',
            right: 'today prev,next'
        }
    });
    console.log(calendar);
    calendar.render();
    return calendar;
}