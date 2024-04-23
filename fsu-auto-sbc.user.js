// ==UserScript==
// @name         FSU-Auto-SBC
// @namespace    xiangyi
// @version      0.1-alpha+24.17
// @description  Auto SBC for EA FC24 UT with FSU plugin
// @author       xiangyi
// @match        https://www.ea.com/ea-sports-fc/ultimate-team/web-app/*
// @match        https://www.easports.com/*/ea-sports-fc/ultimate-team/web-app/*
// @match        https://www.ea.com/*/ea-sports-fc/ultimate-team/web-app/*
// @require      https://cdn.staticfile.org/lodash.js/4.17.21/lodash.min.js
// @grant        GM_addStyle
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      ea.com
// @connect      futbin.com
// @connect      futbin.org
// @connect      futcd.com
// @connect      fut.gg
// @license      MIT
// @updateURL    file:///home/xiangyi/code/misc/fsu/fsu-auto-sbc.user.js
// @downloadURL  file:///home/xiangyi/code/misc/fsu/fsu-auto-sbc.user.js
// ==/UserScript==

(function () {
  "use script";

  !(function (e, t) {
    "object" == typeof exports && "undefined" != typeof module
      ? t(require("lodash"))
      : "function" == typeof define && define.amd
        ? define(["lodash"], t)
        : t((e = e || self)._);
  })(this, function (e) {
    "use strict";
    (e =
      e && Object.prototype.hasOwnProperty.call(e, "default")
        ? e.default
        : e).mixin({
      multicombinations: function (t, n) {
        var i = e.values(t),
          f = function (e, t) {
            if (--t < 0) return [[]];
            var n = [];
            e = e.slice();
            for (
              var i = function () {
                var i = e[0];
                f(e, t).forEach(function (e) {
                  e.unshift(i), n.push(e);
                }),
                  e.shift();
              };
              e.length;

            )
              i();
            return n;
          };
        return f(i, n);
      },
    });
  });
  // wait until FSU is fully initialized
  async function waitForFSU() {
    while (unsafeWindow.events === undefined) {
      console.log("waiting for FSU...");
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  var sbc = {};

  sbc.doDailySBC = async (SBCs) => {
    let dailySBCs = SBCs ?? [
      "TOTS Warm up Daily Login Upgrade",
      "Daily Bronze Upgrade",
      "Daily Silver Upgrade",
      "Daily Gold Upgrade",
    ];
    let allSBCs = services.SBC.repository.getSets();

    // found name matched in allSBCs and saved into sbcSetEntities
    let sbcSetEntities = [];
    for (let i = 0; i < dailySBCs.length; i++) {
      for (let j = 0; j < allSBCs.length; j++) {
        if (dailySBCs[i] === allSBCs[j].name) {
          if (!allSBCs[j].isComplete()) {
            sbcSetEntities.push(allSBCs[j]);
          } else {
            console.log(
              "[FSU-Auto-SBC] SBC already completed: ",
              allSBCs[j].name,
            );
          }
          break;
        }
      }
    }

    console.log(
      "[FSU-Auto-SBC] SBCs to do: ",
      sbcSetEntities.map((s) => s.name),
    );

    for (let i = 0; i < sbcSetEntities.length; i++) {
      if (sbcSetEntities[i].isLimitedRepeatable) {
        for (let j = 0; j < sbcSetEntities[i].repeats; j++) {
          await sbc.autoDoSBC(sbcSetEntities[i]);
        }
      } else if (sbcSetEntities[i].isRepeatable) {
        while (true) {
          await sbc.autoDoSBC(sbcSetEntities[i]);
        }
      } else {
        // do once
        await sbc.autoDoSBC(sbcSetEntities[i]);
      }
    }
  };

  sbc.autoDoSBC = async (SBCSetEntity) => {
    unsafeWindow.events.goToSBC(SBCSetEntity);
    // need to wait for the SBC Hub to load completely
    while (cntlr.current().constructor == UTSBCHubViewController) {
      await unsafeWindow.events.wait(0.2, 0.4);
    }

    async function doSBC() {
      let autoFillBtn = cntlr.right().getView()._fsuAutoFill;
      let submitBtn = cntlr.current().getView()._lView.rightTab;

      autoFillBtn._tapDetected();
      // TODO: check if the squad is filled
      submitBtn._tapDetected();
      console.log("[FSU-Auto-SBC] wait for reward claim pop-up to show");
      await unsafeWindow.events.wait(2, 3);
      console.log("[FSU-Auto-SBC] reward claim pop-up showing");

      let counter = 0;
      while (true) {
        if (gPopupClickShield.queue.length > 0) {
          gPopupClickShield.hideShield();
          counter++;
          if (counter == 2) {
            break;
          }
        }
        await unsafeWindow.events.wait(0.2, 0.4);
      }
    }

    switch (cntlr.current().constructor) {
      case UTSBCSquadSplitViewController: {
        console.log("[FSU-Auto-SBC] SBC started: ", SBCSetEntity.name);
        await doSBC();
        console.log("[FSU-Auto-SBC] SBC completed: ", SBCSetEntity.name);
        break;
      }
      case UTSBCGroupChallengeSplitViewController: {
        let numOfchallenges = cntlr.left().getView()._challengeRows.length;
        for (let i = 0; i < numOfchallenges; i++) {
          if (cntlr.left().getView()._challengeRows[i].isInteractionEnabled()) {
            cntlr.left().getView()._challengeRows[i]._tapDetected();
            // TODO: how to elegantly confirm that the challenge is selected and the right view is changed?
            await unsafeWindow.events.wait(0.2, 0.4);
            cntlr
              .current()
              ._rightController.getView()
              ._btnConfirm._tapDetected();
            // wait until the squad is loaded
            while (
              cntlr.current().constructor != UTSBCSquadSplitViewController
            ) {
              await unsafeWindow.events.wait(0.2, 0.4);
            }
            await doSBC();
          }
        }
        break;
      }
    }
  };
  waitForFSU();
  unsafeWindow.events.notice("FSU-Auto-SBC module loaded!");
  unsafeWindow.sbc = sbc;
})();
