// ==UserScript==
// @name         Fanatical Enhanced
// @namespace    https://sergiosusa.com/
// @version      0.1
// @description  This script enhanced the famous marketplace fanatical with some extra features.
// @author       Sergio Susa (sergio@sergiosusa.com)
// @match        https://www.fanatical.com/en/orders/*
// @icon         https://www.google.com/s2/favicons?domain=fanatical.com
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @require      https://cdnjs.cloudflare.com/ajax/libs/elasticlunr/0.9.6/elasticlunr.js
// @require      https://raw.githubusercontent.com/sergiosusa/fanatical-enhanced/test-external-script/steam-api.js
// ==/UserScript==

(function() {
    'use strict';
    try {
        let steamApi = new SteamApi();
        steamApi.retrieveOwnedGames();
        let fanaticalEnhanced = new FanaticalEnhanced();
        fanaticalEnhanced.render();
    } catch (exception) {
        alert(exception);
    }
})();

function FanaticalEnhanced() {

    this.rendererList = [
        new OrderRevealer()
    ];

    this.render = () => {
        let renderer = this.findRenderer();
        setTimeout( renderer.render,2000);
    }

    this.findRenderer = () => {
        return this.rendererList.find(renderer => renderer.canHandleCurrentPage());
    };

}

function Renderer() {
    this.handlePage = "";

    this.canHandleCurrentPage = () => {
        return document.location.href.includes(this.handlePage);
    };

    this.showAlert = (text) => {
        alert(text);
    }
}

function OrderRevealer() {
    Renderer.call(this);
    this.handlePage = "https://www.fanatical.com/en/orders";

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