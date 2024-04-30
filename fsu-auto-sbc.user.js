// ==UserScript==
// @name         FSU-Auto-SBC
// @namespace    xiangyi
// @version      0.2-alpha+24.17
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
  var _delay;

  async function delay() {
    await unsafeWindow.events.wait(_delay, _delay + 1);
  }

  sbc.doDailySBC = async (SBCs, delay_time) => {
    let dailySBCs = SBCs ?? [
      "TOTS Warm up Daily Login Upgrade",
      "Daily Bronze Upgrade",
      "Daily Silver Upgrade",
      "Daily Gold Upgrade",
    ];
    _delay = delay_time ?? 1.5;
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
    // need to confirm the current view is SBC Hub
    while (cntlr.current().constructor != UTSBCHubViewController) {
      await delay();
    }

    unsafeWindow.events.goToSBC(SBCSetEntity);

    // need to wait for the SBC page to load completely
    while (cntlr.current().constructor == UTSBCHubViewController) {
      await delay();
    }

    async function doSBC(isFromGroupChallenge) {
      let autoFillBtn = cntlr.right().getView()._fsuAutoFill;
      let submitBtn = cntlr.current().getView()._lView.rightTab;
      let expectedPopupQueueLength = isFromGroupChallenge ? 1 : 2;

      autoFillBtn._tapDetected();
      // TODO: check if the squad is filled
      submitBtn._tapDetected();
      console.log("[FSU-Auto-SBC] wait for reward claim pop-up to show");
      while (true) {
        if (gPopupClickShield.queue.length >= expectedPopupQueueLength) {
          break;
        }
        await delay();
      }
      console.log("[FSU-Auto-SBC] reward claim pop-up showing");

      let counter = 0;
      while (true) {
        if (gPopupClickShield.queue.length > 0) {
          // let oldQueneLength = gPopupClickShield.queue.length;
          gPopupClickShield.queue[0].getView()._actionBtn._tapDetected();
          counter++;
          // if (oldQueneLength - 1 != gPopupClickShield.queue.length) {
          //   console.log(
          //     "[FSU-Auto-SBC] very strange inconsistency in popup queue length, idk how to handle it.",
          //   );
          //   throw new Error("pop up length does not decrease by 1");
          // }
          if (counter == expectedPopupQueueLength) {
            break;
          }
        }
        await delay();
      }
    }

    switch (cntlr.current().constructor) {
      case UTSBCSquadSplitViewController: {
        // TODO: make sure not only the root view is loaded
        console.log("[FSU-Auto-SBC] SBC started: ", SBCSetEntity.name);
        await doSBC(true);
        console.log("[FSU-Auto-SBC] SBC completed: ", SBCSetEntity.name);
        break;
      }
      case UTSBCGroupChallengeSplitViewController: {
        // make sure not only the root view is loaded
        while (cntlr.left().getView()._challengeRows.length == 0) {
          await delay();
        }

        let numOfchallenges = cntlr.left().getView()._challengeRows.length;
        for (let i = 0; i < numOfchallenges; i++) {
          if (cntlr.left().getView()._challengeRows[i].isInteractionEnabled()) {
            cntlr.left().getView()._challengeRows[i]._tapDetected();
            // TODO: how to elegantly confirm that the challenge is selected and the right view is changed?
            await delay();
            cntlr
              .current()
              ._rightController.getView()
              ._btnConfirm._tapDetected();
            // wait until the squad is loaded
            while (
              cntlr.current().constructor != UTSBCSquadSplitViewController
            ) {
              await delay();
            }
            await doSBC(true);
            // wait unilt the challenge view is loaded
          }
        }
        break;
      }
    }

    // SBC is finished, claim the final reward
    gPopupClickShield.queue[0].getView()._actionBtn._tapDetected();
    // wait unilt the Popup is hidden
    while (gPopupClickShield.queue.length > 0) {
      await delay();
    }
  };

  // cntlr.current().getView().storePacks[0]._btnOpen._tapDetected();
  // cntlr.left().getView()._fsuClub._tapDetected();
  // if duplicate, dupList = cntlr.left().getViewModel().getDuplicateSection()
  // quick sell: cntlr.left().quickSell(
  //  cntlr.left().getViewModel().getDiscardableInfo().duplicates.entities,
  //  cntlr.left().getViewModel().getDiscardableInfo().duplicates.value
  // )
  // repositories.Store.myPacks

  // packs: { "name1": count1, "name2": count2, ...} /* if count is 0, then open all matched packs in stock */
  // dupRules: [["80+ Player Pick"], ["83+ TOTW Player Pick"]] /* 0-81, 82-85, 86+:stop; SBC Names or "QS" to quick sell */
  sbc.autoPacking = async (packs, dupRules, delay_time) => {
    // TODO: currently assume there isn't unassigned item and is on Packs tab
    if (cntlr.current().getView().constructor != UTStoreView) {
      console.error("[FSU-Auto-SBC] Not in Packs tab");
      return;
    }
    if (unsafeWindow.repositories.Item.getUnassignedItems().length > 0) {
      console.error("[FSU-Auto-SBC] Unassigned items found");
      return;
    }

    _delay = delay_time ?? 1.5;

    // every time a pack is opened, the storePakcs will be updated
    // so we need to get the current storePacks every time
  };

  waitForFSU();
  unsafeWindow.events.notice("FSU-Auto-SBC module loaded!");
  unsafeWindow.sbc = sbc;
})();
