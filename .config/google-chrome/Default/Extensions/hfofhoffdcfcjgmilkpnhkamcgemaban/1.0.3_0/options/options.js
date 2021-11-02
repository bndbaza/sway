! function() {
    function a(a) {
        return document.getElementById(a)
    }
    function b() {
        const b = a("folder").style,
            c = a("folderName");
        chrome.storage.local.get(["all", "tags", "folder", "path"], a => {
            d[0].checked = !(!0 != a.all), d[1].checked = !(!0 != a.tags), !0 == a.folder ? (c.value = a.path, d[2].checked = !0, b.visibility = "visible", c.oninput = () => {
                chrome.storage.local.set({
                    path: c.value.replace(/[^a-z,0-9,A-Z,а-я,А-Я,-,_]/gi, "")
                })
            }) : (d[2].checked = !1, b.visibility = "hidden", b.height = 0)
        })
    }
    function c(a) {
        chrome.storage.local.get(["all", "tags", "folder"], () => {
            a.addEventListener("change", () => {
                a == d[0] && chrome.storage.local.set({
                    all: d[0].checked
                }), a == d[1] && chrome.storage.local.set({
                    tags: d[1].checked
                }), a == d[2] && (chrome.storage.local.set({
                    folder: d[2].checked
                }), b())
            })
        })
    }
    const d = [a("displayAllButton"), a("tags"), a("userFolder")];
    chrome.storage.local.get("path", a => {
        for(let e in a.path && 0 != a.path.length || chrome.storage.local.set({
                folder: !1,
                path: ""
            }), b(), d) c(d[e])
    })
}();