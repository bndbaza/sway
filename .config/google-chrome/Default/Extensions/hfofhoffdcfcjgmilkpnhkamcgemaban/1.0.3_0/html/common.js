! function() {
    function a(a) {
        return document.getElementById(a)
    }
    function b() {
        const b = a("ask"),
            c = a("show"),
            d = a("mail"),
            e = a("good"),
            f = a("bad"),
            g = a("check"),
            h = a("ws");
        e.onclick = () => {
            b.style.display = "none", c.style.display = "block"
        }, f.onclick = () => {
            b.style.display = "none", d.style.display = "block"
        }, h.onclick = () => {
            try {
                _gaq.push(["_trackEvent", "click", "ws"])
            } catch (a) {}
            window.open(`https://chrome.google.com/webstore/detail/${chrome.runtime.id}/reviews`)
        }, vk.onclick = () => {
            try {
                _gaq.push(["_trackEvent", "click", "vk"])
            } catch (a) {}
            window.open(`https://vk.com/share.php?url=https://yandexmusic.pro&title=Скачивай Яндекс.Музыку бесплатно!&description=Скачать треки и целые альбомы в один клин с Яндекс Музыки.`, "", "menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600")
        }, ok.onclick = () => {
            try {
                _gaq.push(["_trackEvent", "click", "ok"])
            } catch (a) {}
            window.open(`https://connect.ok.ru/offer?url=https://yandexmusic.pro&title=Скачивай Яндекс.Музыку бесплатно!&description=Скачать треки и целые альбомы в один клин с Яндекс Музыки.`, "", "menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600")
        }, fb.onclick = () => {
            try {
                _gaq.push(["_trackEvent", "click", "fb"])
            } catch (a) {}
            window.open(`https://www.facebook.com/sharer.php?u=https://yandexmusic.pro&title=Скачивай Яндекс.Музыку бесплатно!&description=Скачать треки и целые альбомы в один клин с Яндекс Музыки.`, "", "menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600")
        }
    }
    b()
}();