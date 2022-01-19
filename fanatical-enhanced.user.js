// ==UserScript==
// @name         Fanatical Enhanced
// @namespace    https://sergiosusa.com/
// @version      0.1
// @description  This script enhanced the famous marketplace fanatical with some extra features.
// @author       Sergio Susa (sergio@sergiosusa.com)
// @match        https://www.fanatical.com/*/orders/*
// @match        https://www.fanatical.com/*/bundle/*
// @match        https://www.fanatical.com/*/pick-and-mix/*
// @icon         https://www.google.com/s2/favicons?domain=fanatical.com
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @require      https://cdnjs.cloudflare.com/ajax/libs/elasticlunr/0.9.6/elasticlunr.js
// @require      https://raw.githubusercontent.com/sergiosusa/steam-api-client-for-userscript/main/steam-api-client.js
// ==/UserScript==

(function () {
    'use strict';
    try {
        let fanaticalEnhanced = new FanaticalEnhanced();
        fanaticalEnhanced.render();
    } catch (exception) {
        alert(exception);
    }
})();

function FanaticalEnhanced() {

    this.rendererList = [
        new OrderRevealer(),
        new BundleChecker()
    ];

    this.render = () => {
        let renderer = this.findRenderer();
        setTimeout(renderer.render, 2000);
    }

    this.findRenderer = () => {
        return this.rendererList.find(renderer => renderer.canHandleCurrentPage());
    };

}

function Renderer() {
    this.handlePage = "";

    this.canHandleCurrentPage = () => {
        return null !== document.location.href.match(this.handlePage);
    };

    this.showAlert = (text) => {
        alert(text);
    }
}

function BundleChecker() {
    Renderer.call(this);

    this.handlePage = /https:\/\/www\.fanatical\.com\/.*\/(bundle|pick-and-mix)\/.*/g;

    this.steamApiClient = null;

    this.own = [];
    this.notOwn = [];

    this.render = () => {
        this.steamApiClient = new SteamApiClient();
        this.steamApiClient.retrieveOwnedGames().then(
            (gameIndex) => {
                this.getGamesTitles().then((gamesTitles) => {
                    this.compareGames(gamesTitles, gameIndex);

                    let nodes = document.querySelectorAll("div.card-overlay");

                    for (let x = 0; x < this.own.length; x++) {
                        let found = false;
                        for(let y = 0; y < nodes.length && !found; y++) {
                            if (nodes[y].querySelector("p").innerText === this.own[x].name){
                                this.addResult(nodes[y], '#D88000', 'Own', this.own[x].url);
                                found = true;
                            }
                        }
                    }
                    
                    for (let x = 0; x < this.notOwn.length; x++) {
                        let found = false;
                        for(let y = 0; y < nodes.length && !found; y++) {
                            if (nodes[y].querySelector("p").innerText === this.notOwn[x].name){
                                this.addResult(nodes[y], '#18a3ff', 'Not Own', this.notOwn[x].url);
                                found = true;
                            }
                        }
                    }
                });
            }
        );
    }

    this.compareGames = (games, myGames) => {

        for (let x = 0; x < games.length; x++) {

            let game = myGames.documentStore.getDoc(games[x].id);
            if (game){
                this.own.push(game);
            } else {
                games[x].url = this.steamApiClient.generateGameUrl(games[x].id);
                this.notOwn.push(games[x]);
            }

           /*
            let gameName = this.clearGameName(games[x].name);
            let results = myGames.search(gameName);

            let result = this.findExactMatch(results, gameName);

            if (result) {
                games[x].url = result.doc.url;
                this.own.push(games[x]);
            } else {
                games[x].url = this.getSearchUrl(gameName);
                this.notOwn.push(games[x]);
            }
            */

        }
    };

    this.addResult = (item, color, text, link) => {

        item.parentElement.parentElement.querySelector('.card-content').style.border = "solid " + color;
        let responseDiv = document.createElement('div');

        if (link != null) {
            text = '<a onclick="window.open(\'' + link + '\');" style="cursor:pointer">' + text + '</a>';
        }

        responseDiv.innerHTML = '<span style="color:' + color + ';margin-left:0;font-weight: bold;background:none;display:inline;">(' + text + ')</span>';
        item.parentElement.parentElement.querySelector('.card-icons-price-container').appendChild(responseDiv);
    };

    this.getGamesTitles = () => {


        let apiUrl = window.location.href.replace(/\/\w{2}\/bundle\//g, "/api/products-group/").replace(/\/\w{2}\//g, "/api/");
        let products = [];
        let games = [];

        return new Promise(((resolve, reject) => {

            GM_xmlhttpRequest({
                method: "GET",
                url: apiUrl,
                onload: function (response) {

                    let jsonResponse = JSON.parse(response.responseText);

                    if (undefined !== jsonResponse.products) {
                        products = jsonResponse.products;
                    } else {
                        let bundles = jsonResponse.bundles;
                        for (let x = 0; x < bundles.length; x++) {
                            products = products.concat(bundles[x].games);
                        }
                    }

                    for (let x = 0; x < products.length; x++) {
                        games.push({
                            id: products[x].steam.id,
                            name: products[x].name
                        });
                    }
                    resolve(games);
                }.bind(this)
            });
        }));

        // https://www.fanatical.com/en/pick-and-mix/build-your-own-fantasy-bundle
        // https://www.fanatical.com/api/pick-and-mix/build-your-own-fantasy-bundle/en

        // https://www.fanatical.com/en/bundle/guardian-bundle-5
        // https://www.fanatical.com/api/products-group/guardian-bundle-5/en


        /*
        let cards = document.querySelectorAll('.card-overlay');

        for (let x = 0; x < cards.length; x++) {
            games.push(
                {
                    name: cards[x].innerText.replace('Product details', '').replace('Detalles del producto', '').replace('ADD', '').trim(),
                    node: cards[x]
                }
            );
        }
        return games;
        */
    };

    this.findExactMatch = (results, gameName) => {
        for (let y = 0; y < results.length; y++) {
            if (this.exactMatch(results[y].doc.name, gameName)) {
                return results[y];
            }
        }
        return null;
    };

    this.exactMatch = (resultGame, myGame) => {
        return resultGame.toLowerCase() === myGame.toLowerCase();
    };

    this.clearGameName = (gameName) => {
        return gameName.replace('Locked content', '').replace('Product details', '').replace('Detalles del producto').trim();
    };

    this.getSearchUrl = (gameName) => {
        return 'https://store.steampowered.com/search/?term=' + gameName;
    };

}

BundleChecker.prototype = Object.create(Renderer.prototype);

function OrderRevealer() {
    Renderer.call(this);
    this.handlePage = /https:\/\/www\.fanatical\.com\/.*\/orders\/.*/g;

    this.render = () => {
        let referenceElement = document.querySelector('div.title-download-button-container');

        let buttonContainer = document.createElement("div");
        buttonContainer.className = 'title-button-container';
        buttonContainer.innerHTML =
            '<button type="button" id="reveal-keys-button" class="btn-line-account btn btn-secondary">Reveal Keys</button>' +
            '<button type="button" id="copy-excel-button" class="btn-line-account btn btn-secondary">Copy Excel</button>' +
            '<button type="button" id="copy-list-button" class="btn-line-account btn btn-secondary">Copy List</button>';

        referenceElement.parentElement.insertBefore(buttonContainer, referenceElement.nextElementSibling);

        document.querySelector("#reveal-keys-button").onclick = this.revealKeys;
        document.querySelector("#copy-excel-button").onclick = this.copyExcel;
        document.querySelector("#copy-list-button").onclick = this.copyList;

    };

    this.revealKeys = () => {
        let revealButtons = document.querySelectorAll("div.key-container button");

        revealButtons.forEach((element) => {
            element.click();
        });
    };

    this.copyExcel = () => {

        let result = [];

        document.querySelectorAll("div.order-item-details-container").forEach((gameElement) => {
            let gameName = gameElement.querySelector("div.game-name").innerText;
            let gameKey = gameElement.querySelector("input.key-input-field").value;

            result.push(gameName + "\t" + gameKey)
        });

        this.copyToClipboard(result.join("\n"));
    };

    this.copyList = () => {
        let result = [];

        document.querySelectorAll("div.order-item-details-container").forEach((gameElement) => {
            let gameKey = gameElement.querySelector("input.key-input-field").value;

            result.push(gameKey)
        });

        this.copyToClipboard(result.join());
    };

    this.copyToClipboard = (list) => {
        GM_setClipboard(list);
        this.showAlert("Seriales copiados al portapapeles");
    };

}

OrderRevealer.prototype = Object.create(Renderer.prototype);