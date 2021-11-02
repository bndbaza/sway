! function() {
    function a() {
        const b = setInterval(() => {
            clearInterval(b), a(), d()
        }, 1e3)
    }
    function c(a) {
        return a.replace(/[?:;"<>\/|*]/gi, "_")
    }
    function d() {
        const a = document.getElementsByClassName("d-track");
        if(a)
            for(let b in a) "DIV" == a[b].tagName && e(a[b])
    }
    function e(a) {
        let b = a.classList;
        if(b.contains("_music_ready") || !a) return null;
        b.add("_music_ready");
        let c = a.getElementsByClassName("d-track__title")[0],
            d = a.parentElement.getElementsByClassName("track_type_player")[0];
        if(c && !d) {
            let b = document.createElement("span");
            b.href = "#", b.title = "\u0421\u043A\u0430\u0447\u0430\u0442\u044C", b.classList.add("_music_save"), b.innerHTML = `<button class="button button_round button_action button-play button-play__type_track button_ico" id="_music_save_button" style="background-image: url(${chrome.extension.getURL("images/save_button.png")})"></button>`, c.parentElement.insertBefore(b, c);
            let d = document.querySelectorAll(".page-main__chart.column-chart, .page-metatag__tracks, .sidebar__tracks, .page-artist__tracks_top");
            0 == d.length && (d = [b.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement]), chrome.runtime.sendMessage({
                message: "a"
            }, a => {
                d && !0 == a && [...d].forEach(a => {
                    let b = a.querySelectorAll("._music_save") || [];
                    1 < b.length && g(a)
                })
            }), b.addEventListener("click", function(c) {
                if(this.alreadyCalled) return !0;
                this.alreadyCalled = !0, b.innerHTML = "<button class=\"button button_round button_action button-play button-play__type_track button_ico\" id=\"_music_save_button\">0%</button>", c.stopPropagation(), c.preventDefault();
                let d = a.getElementsByClassName("d-track__play")[0].getElementsByTagName("button")[0].getAttribute("data-idx");
                if(d) return h++, 7 < h ? void j.push([b, d]) : void f(b, d)
            })
        }
    }
    function f(a, b) {
        fetch(`https://music.yandex.ru/handlers/track.jsx?track=${b}`).then(a => a.json()).then(b => {
            let e = b.track,
                g = `https://music.yandex.ru/api/v2.1/handlers/track/${e.id}/track/download/m?hq=1`;
            fetch(g, {
                headers: {
                    Accept: "application/json; q=1.0, text/*; q=0.8, */*; q=0.1",
                    "X-Requested-With": "XMLHttpRequest",
                    "X-Retpath-Y": encodeURIComponent(location.href)
                }
            }).then(a => a.json()).then(b => {
                fetch(`${b.src}&format=json`).then(a => a.json()).then(g => {
                    if(!g.s) return;
                    let d, i, l = ["XGRlBW9FXlekgbPrRHuSiA", g.path.substr(1), g.s],
                        m = "",
                        n = [],
                        o = "",
                        p = "",
                        q = "";
                    if(l = l.join(""), l = window.Crypto.MD5(l), d = encodeURIComponent(`https://${g.host}/get-mp3/${l}/${g.ts}${g.path}`), e.title && (o = e.title), e.artists[1]) {
                        for(let a in e.artists) m += e.artists[a].name + ",", n.push(e.artists[a].name);
                        m = m.substring(0, m.length - 1)
                    } else e.artists[0] ? (n.push(e.artists[0].name), m = e.artists[0].name) : m = e.title;
                    if(e.version && (o += ` (${e.version})`), m = c(`${m} - ${o}.mp3`), e.albums[0]) {
                        p = e.albums[0].title || "", q = e.albums[0].year || "";
                        try {
                            genre = e.albums[0].genre || e.albums[0].genre[0]
                        } catch (a) {
                            genre = ""
                        }
                        try {
                            number = e.albums[0].trackPosition.index
                        } catch (a) {
                            number = ""
                        }
                    }
                    if(e.coverUri) {
                        let a = e.coverUri.replace("%%", "400x400");
                        i = encodeURIComponent(`https://${a}`)
                    }
                    let r = !1;
                    k.postMessage({
                        message: "d",
                        url: d,
                        name: m,
                        artist: n,
                        title: o,
                        album: p,
                        cover: i,
                        year: q,
                        genre: genre,
                        number: number
                    }), k.onMessage.addListener(b => {
                        if(b.message && b.url == d) {
                            if(a.innerHTML = `<button class="button button_round button_action button-play button-play__type_track button_ico" id="_music_save_button">${b.message}</button>`, "100%" == b.message && !r && (r = !0, a.innerHTML = `<button class="button button_round button_action button-play button-play__type_track button_ico" id="_music_save_button" style="background-color: #0cf40c">100%</button>`, h--, 0 < j.length)) {
                                let a = j.shift();
                                f(a[0], a[1])
                            }
                            "100%" == b.message && (a.innerHTML = `<button class="button button_round button_action button-play button-play__type_track button_ico" id="_music_save_button" style="background-color: #0cf40c">100%</button>`)
                        }
                    })
                })
            }).catch(() => null)
        }).catch(() => null)
    }
    function g(a) {
        function b(b) {
            let c = a.querySelectorAll(b);
            d.innerHTML = `Загрузка ${c.length} треков началась...<br> * Загрузка будет завершена автоматически *`, d.title = "\u041E\u0436\u0438\u0434\u0430\u0439\u0442\u0435 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0432\u0441\u0435\u0445 \u0442\u0440\u0435\u043A\u043E\u0432";
            for(let a, d = 0; d < c.length; d++) a = c.item(d), a.click()
        }
        function c() {
            b("#_music_save_button")
        }
        let d = document.createElement("span"),
            e = a.querySelector("._music_download_all_container");
        e || (d.className = "_music_download_all_btn", d.title = "\u041D\u0430\u0436\u043C\u0438, \u0447\u0442\u043E\u0431\u044B \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u0432\u0441\u0435 \u0430\u0443\u0434\u0438\u043E\u0437\u0430\u043F\u0438\u0441\u0438", d.innerHTML = "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0432\u0441\u0435 \u0430\u0443\u0434\u0438\u043E\u0437\u0430\u043F\u0438\u0441\u0438", e = document.createElement("div"), e.className = "_music_download_all_container", e.appendChild(d)), d.removeEventListener("click", c, !1), d.addEventListener("click", c, !1), a.insertBefore(e, a.nextSibling)
    }
    let h = 0,
        j = [];
    const k = chrome.runtime.connect({
            name: "c"
        }),
        l = chrome.runtime.id;
    a()
}();