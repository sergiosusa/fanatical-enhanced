function SteamApi() {

    const END_POINTS = {
        OWNED_GAMES: "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=[STEAM_API_ID]&steamid=[STEAM_USER]&include_appinfo=true"
    };

    const URLS = {
        GAME: "https://store.steampowered.com/app/[APP_ID]",
        SEARCH: "https://store.steampowered.com/search/?term="
    }

    this.steamUser = null;
    this.steamApiId = null;

    this.searchIndex = null;

    this.retrieveOwnedGames = () => {

        this.steamUser = this.fillOrRetrieveVariable('steam-user');
        this.steamApiId = this.fillOrRetrieveVariable('steam-api-id');

        this.initializeSearchIndex();

        return new Promise(((resolve, reject) => {

            GM_xmlhttpRequest({
                method: "GET",
                url: END_POINTS.OWNED_GAMES.replace('[STEAM_USER]', this.steamUser).replace("[STEAM_API_ID]", this.steamApiId),
                onload: function (response) {

                    let games = JSON.parse(response.responseText).response.games;

                    for (let x = 0; x < games.length; x++) {
                        let appId = games[x].appid;
                        let name = games[x].name.trim().replace('  ', ' ');
                        let url = this.generateGameUrl(games[x].appid);
                        let searchUrl = this.generateSearchUrl();

                        let doc = {
                            "appId": appId,
                            "name": name,
                            "url": url,
                            "searchUrl": searchUrl
                        };

                        this.searchIndex.addDoc(doc);
                    }

                    this.storeIndex(this.steamUser, this.searchIndex);
                    resolve(this.searchIndex);
                }.bind(this)
            });

        }));

    };

    this.initializeSearchIndex = () => {
        elasticlunr.addStopWords(['™']);
        this.searchIndex = elasticlunr(function () {
            this.addField('name');
            this.addField('url');
            this.addField('searchUrl');
            this.setRef('appId');
        });
    };

    this.storeIndex = (steamUserId, searchIndex) => {
        localStorage.setItem(steamUserId, JSON.stringify(searchIndex));
    };

    this.generateGameUrl = (appId) => {
        return URLS.GAME.replace('[APP_ID]', appId);
    };

    this.generateSearchUrl = () => {
        return URLS.SEARCH;
    };

    this.fillOrRetrieveVariable = (key) => {
        let variable = localStorage.getItem(key);
        if (!variable) {
            variable = prompt('Enter the ' + key);

            if (!variable) {
                throw key + ' is mandatory.';
            }
        }
        localStorage.setItem(key, variable);
        return variable;
    }
}