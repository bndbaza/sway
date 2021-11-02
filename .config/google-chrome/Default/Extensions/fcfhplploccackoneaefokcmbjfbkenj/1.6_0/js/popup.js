class Popup {

    constructor() {
        this.storage = STORAGE;
        this.initHandlers();
        this.initStorage();
        this.initListeners();
    }

    initUI() {
        if(this.storage.vpnOn) {
            $('#disconnect_btn').addClass('active');
        }
    }

    initListeners() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (this.storage) {
                for (let key in changes) {
                    if (key == 'country' || key == 'connectionInfo') {
                        this.storage[key] = changes[key].newValue;
                    }
                }
            }
        });

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            //console.log("got message",request);
            if (request.action == 'gotIP')
            {
                //console.log("set current IP",request.data.ip);
                if (this.storage.vpnOn && !document.body.classList.contains('error')) {
                    if(!request.data.disabled) {
                        chrome.runtime.sendMessage({
                            'action': 'getConfig'
                        }, (res) => {
                            this.showConnectionInfo();
                            this.setState('connected');
                        });
                    }
                }
            }
            else if (request.action == 'gotIPError')
            {
                if(this.storage.vpnOn) {
                    this.showError('No IP found, please reconnect');
                }
            }
            else if (request.action == 'disconnected')
            {
                this.renderCountries();

                //console.log(request)
                if(this.storage.auto) {
                    this.connectAutoPick();
                } else {
                    if (this.storage.vpnOn) {
                        this.showError('Server not found, please reconnect');
                    }
                }
            }
            else if (request.action == 'connecting')
            {
                this.setState('connecting');
            }
            else if (request.action == 'connected')
            {
                $('#disconnect_btn').addClass('active');
                this.setState('connected');
                this.showConnectionInfo();
                this.renderCountries();
            }
            else if (request.action == 'disable')
            {
                //console.log('disable')
                this.setState('disconnected');
                this.renderCountries();

            }
        });
    }

    initHandlers() {
        const $b = $(document.body);
        $b.on('change', '#vpn-on', e => {
            //console.log('storage:', this.storage)

            if (!this.storage.vpnOn) {
                this.connect();
            } else {
                this.disconnect();
            }
        });

        $b.on('click', '#countries .country', e => {
            // //console.log('e:', e.currentTarget.dataset.code)
            if(this.storage.vpnOn) {
                return;
            }
            if (this.storage.country != e.currentTarget.dataset.code || !this.storage.vpnOn) {
                this.resetCountriesTitles();
                this.connect(e.currentTarget.dataset.code);
            }
        })

        $b.on('click', '.close-rate-us', e => {
            // //console.log('e:', e.currentTarget.dataset.code)
            $('#rate_us').removeClass('open');
        })
        $b.on('click', '.rate-btn', e => {
            if(!this.storage.rated) {
                this.storage.rated = true;
                this.storage.dateRated = Date.now();
                chrome.runtime.sendMessage({
                    action: 'rated'
                })
            } else {
                this.storage.ratedFinal = true;
                chrome.runtime.sendMessage({
                    action: 'ratedFinal'
                })
            }
            $('#rate_us').removeClass('open');
        })

        $b.on('click', '#disconnect_btn', e => {
            if(this.storage.vpnOn) {
                this.disconnect();
                $('#disconnect_btn').removeClass('active');
                this.showRateUs();
            }
            // //console.log('e:', e.currentTarget.dataset.code)
        })
    }

    initStorage() {
        chrome.runtime.sendMessage({
            'action': 'getConfig'
        }, (res) => {
            //console.log('getConfig:', res)
            this.storage = res;
            this.initUI();
            this.run();
        })
    }

    run() {
        this.initPopup();
    }

    initPopup() {
        this.initCountries();
        document.querySelector('.rate-btn').href = "https://chrome.google.com/webstore/detail/" + chrome.runtime.id + '/reviews';


        if (this.storage.vpnOn) {
            if (this.storage.isConnecting) {
                this.setState('connecting');
            } else {
                this.setState('connected');
            }
        } else {
            this.setState();
        }

        this.showConnectionInfo();
    }

    resetCountriesTitles() {
        let countries = document.getElementById('countries').children;

        if(countries) {
            for (let i = 0; i < countries.length; i++) {
                countries[i].querySelector('.title').innerHTML = this.storage.locations.find(l => l.country_code == countries[i].dataset.code).country_name;
            }
        }
    }

    renderCountries() {
        chrome.runtime.sendMessage({
            'action': 'getConfig'
        }, (res) => {
                let countries = document.getElementById('countries').children;
            for (let i = 0; i < countries.length; i++) {
                let title = '';
                if (this.storage.vpnOn && (this.storage.connectionInfo.code == this.storage.locations[i].country_code)) {
                    title = this.storage.connectionInfo.code + ', ' + this.storage.connectionInfo.ip;
                } else {
                    title = this.storage.locations[i].country_name;
                }
                //console.log(title)
                countries[i].querySelector('.title').innerHTML = title;
                countries[i].className = `country ${(!this.storage.vpnOn) ? 'active' : ''} ${(this.storage.vpnOn && (this.storage.connectionInfo.code == this.storage.locations[i].country_code)) ? '' : 'inactive'}`;
            }
        });
    }

    initCountries() {
        chrome.runtime.sendMessage({
            'action': 'getConfig'
        }, (res) => {
            this.storage = res;
            let html = '';
            for (let i = 0; i < this.storage.locations.length; i++) {
                let title = '';
                if (this.storage.vpnOn && (this.storage.connectionInfo.code == this.storage.locations[i].country_code)) {
                    title = this.storage.connectionInfo.code + ', ' + this.storage.connectionInfo.ip;
                } else {
                    title = this.storage.locations[i].country_name;
                }
                //console.log(title)
                html += `
                    <div class="country ${(!this.storage.vpnOn) ? 'active' : '123'} ${(this.storage.vpnOn && (this.storage.connectionInfo.code == this.storage.locations[i].country_code)) ? '' : 'inactive'}" data-code="${this.storage.locations[i].country_code}">
                        <img class="flag" src="./img/svg/${this.storage.locations[i].country_code}.svg" alt="">
                        <div class="title">${title}</div>
                    </div>
                `
            }
            document.getElementById('countries').innerHTML = html;
        });


    }

    setState(state) {
        //console.log('set state', state);
        const bcl = document.body.classList;
        bcl.remove('error');

        switch (state) {
            case 'connecting':
                bcl.remove('off');
                bcl.remove('on');
                bcl.add('loading');
                break;
            case 'connected':
                bcl.remove('loading');
                bcl.remove('off');
                bcl.add('on');
                break;
            case 'disconnected':
                bcl.add('off');
                bcl.remove('on');
                bcl.remove('loading');
                break;
            case 'error':
                bcl.remove('off');
                bcl.remove('on');
                bcl.add('error');
                bcl.add('loading');
                break;
            default:
                bcl.remove('on');
                bcl.remove('loading');
                bcl.add('off');
                break;
        }
    }

    showRateUs() {
        //172800000 == 2 days
        if ((Date.now() - this.storage.dateInstall) >= 172800000) {
            if(this.storage.rated) {
                //2592000000 == 1 month
                if ((Date.now() - this.storage.dateRated) >= 2592000000) {
                    if(!this.storage.ratedFinal) {
                        $('#rate_us').addClass('open');
                    }
                }
            } else {
                $('#rate_us').addClass('open');
            }
        }
    }


    showError(text) {
        this.setState('error');
        $('#error_text').html(text);
    }

    connect(country) {
        this.storage.vpnOn = true;
        chrome.runtime.sendMessage({
            action: 'connect',
            from: 'popup',
            country: country
        })
    }

    disconnect() {
        this.storage.vpnOn = false;
        chrome.runtime.sendMessage({
            action: 'disconnect',
            from: 'popup',
        })
    }

    connectAutoPick() {
        let countries = this.storage.locations.filter(i => i.premium);
        let randomCountry = countries[Math.round(Math.random() * (countries.length - 1))];
        this.storage.country = randomCountry.country_code;
        this.connect(this.storage.country);
    }

    showConnectionInfo(country, ip){
        chrome.runtime.sendMessage({
            'action': 'getConfig'
        }, (res) => {
            let title = $(`#countries .country[data-code="${res.connectionInfo.country}"] .title`);
            if(title) {
                title.html(res.connectionInfo.country + ', ' + res.connectionInfo.ip)
            }
        });
    }
}

// noinspection JSUnusedGlobalSymbols
const p = new Popup();
