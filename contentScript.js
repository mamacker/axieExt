var observer;

const observerConfig = { attributes: false, childList: true, subtree: true };
const colorMap = {
  plant: "rgb(108, 192, 0)",
  reptile: "rgb(200, 138, 224)",
  beast: "rgb(255, 184, 18)",
  aquatic: "rgb(0, 184, 206)",
  bird: "rgb(255, 139, 189)",
  bug: "rgb(255, 83, 65)",
};

const classGeneMap = {
  "0000": "beast",
  "0001": "bug",
  "0010": "bird",
  "0011": "plant",
  "0100": "aquatic",
  "0101": "reptile",
  1000: "mech",
  1001: "dawn",
  1010: "dusk",
};

const typeOrder = {
  patternColor: 1,
  eyes: 2,
  mouth: 3,
  ears: 4,
  horn: 5,
  back: 6,
  tail: 7,
};
const geneColorMap = {
  "0000": {
    "0010": "ffec51",
    "0011": "ffa12a",
    "0100": "f0c66e",
    "0110": "60afce",
  },
  "0001": { "0010": "ff7183", "0011": "ff6d61", "0100": "f74e4e" },
  "0010": { "0010": "ff9ab8", "0011": "ffb4bb", "0100": "ff778e" },
  "0011": { "0010": "ccef5e", "0011": "efd636", "0100": "c5ffd9" },
  "0100": {
    "0010": "4cffdf",
    "0011": "2de8f2",
    "0100": "759edb",
    "0110": "ff5a71",
  },
  "0101": {
    "0010": "fdbcff",
    "0011": "ef93ff",
    "0100": "f5e1ff",
    "0110": "43e27d",
  },
  //nut hidden_1
  1000: {
    "0010": "D9D9D9",
    "0011": "D9D9D9",
    "0100": "D9D9D9",
    "0110": "D9D9D9",
  },
  //star hidden_2
  1001: {
    "0010": "D9D9D9",
    "0011": "D9D9D9",
    "0100": "D9D9D9",
    "0110": "D9D9D9",
  },
  //moon hidden_3
  1010: {
    "0010": "D9D9D9",
    "0011": "D9D9D9",
    "0100": "D9D9D9",
    "0110": "D9D9D9",
  },
};
const PROBABILITIES = { d: 0.375, r1: 0.09375, r2: 0.03125 };
const parts = ["eyes", "mouth", "ears", "horn", "back", "tail"];
const MAX_QUALITY = 6 * (PROBABILITIES.d + PROBABILITIES.r1 + PROBABILITIES.r2);
const MAX_RUN_RETRIES = 30;
const OPTIONS_MAP = {
  class: "classes",
  part: "parts",
  bodyShape: "bodyShapes",
  stage: "stages",
  mystic: "numMystic",
};
const SEARCH_PARAMS = [
  "class",
  "stage",
  "breedCount",
  "mystic",
  "pureness",
  "region",
  "title",
  "part",
  "bodyShape",
  "hp",
  "speed",
  "skill",
  "morale",
];

var notReadyCount = 0;
var currentURL = window.location.href;
var axies = {};
var initObserver = true;

var debug = false;

function debugLog(msg, ...extra) {
  if (debug) {
    if (extra.length > 0) console.log(msg, extra);
    else console.log(msg);
  }
}

function loadComplete(mutationsList) {
  for (let i = 0; i < mutationsList.length; i++) {
    for (let j = 0; j < mutationsList[i].removedNodes.length; j++) {
      //if the spinning puff is removed then we are loaded
      if (
        "innerHTML" in mutationsList[i].removedNodes[j] &&
        mutationsList[i].removedNodes[j].innerHTML.includes("puff-loading.png")
      ) {
        debugLog("loadComplete true", mutationsList[i].removedNodes[j]);
        return true;
      }
    }

    for (let j = 0; j < mutationsList[i].addedNodes.length; j++) {
      if (
        ("innerHTML" in mutationsList[i].addedNodes[j] &&
          mutationsList[i].addedNodes[j].innerHTML.includes(
            '<div class="axie-card">'
          )) ||
        (mutationsList[i].addedNodes[j].nodeName == "SPAN" &&
          mutationsList[i].addedNodes[j].innerText.match(/\d+ Axies$/))
      ) {
        debugLog("loadComplete true", mutationsList[i].addedNodes[j]);
        return true;
      }
    }
  }
  if (
    window.location.href.startsWith(
      "https://marketplace.axieinfinity.com/axie"
    ) &&
    document.getElementsByTagName("canvas").length > 0
  ) {
    debugLog("loadComplete true, canvas exists");
    return true;
  }

  debugLog("loadComplete false");
  return false;
}

async function init() {
  //console.log("init");
  await getBodyParts();

  /*
    supported pages
    https://marketplace.axieinfinity.com/profile/inventory/axie(?page=N)
    https://marketplace.axieinfinity.com/profile/[ADDRESS]/axie(?page=N)
    https://marketplace.axieinfinity.com/axie
    https://marketplace.axieinfinity.com/axie/17469
    */

  let callback = function (mutationsList, observer) {
    debugLog("mutationsList", mutationsList);

    //ignore if not a supported page
    if (
      !window.location.href.match(
        /https:\/\/marketplace\.axieinfinity\.com\/profile\/(inventory|(0x|ronin:)\w+)\/axie/
      ) &&
      !window.location.href.startsWith(
        "https://marketplace.axieinfinity.com/axie"
      )
    ) {
      //console.log("Ignoring change.");
      return;
    }

    if (
      window.location.href == currentURL &&
      !window.location.href.startsWith(
        "https://marketplace.axieinfinity.com/axie/d+"
      )
    ) {
      //ignore details page
      //fix Order By drop down z-index
      if (
        mutationsList.length == 1 &&
        mutationsList[0].target.children.length == 2
      ) {
        var mutated = mutationsList[0];

        try {
          // Z-Index fix from Freak.
          if (
            mutated.target.children[1].children[0].nodeName == "DIV" &&
            mutated.target.children[1].children[0].textContent.search(
              /Highest Price|Not for sale/
            )
          ) {
            mutated.target.children[1].children[0].style["zIndex"] = 9998;
          }
        } catch (ex) {}
      } else {
        //console.log("Ignoring axie mutation.");
      }
    }

    if (window.location.href != currentURL) {
      currentURL = window.location.href;
      clearMorphDiv();
      //console.log("New URI detected.");
    }

    //Only call run() if we find certain conditions in the mutation list
    if (loadComplete(mutationsList)) {
      //if you browses quickly, run() won't clearInterval before the page is ready
      if (intID != -1) {
        clearInterval(intID);
      }
      intID = setInterval(run, 1000);
    } else {
      //console.log("loadComplete false");
    }
  };
  observer = new MutationObserver(callback);
}

var bodyPartsMap = {};
async function getBodyParts() {
  //let parts = await fetch('https://axieinfinity.com/api/v2/body-parts').
  //    then(res => res.json()).
  //    catch(async (err) => {
  //console.log("Failed to get body parts from the API");
  //API is unreliable. fall back to hard-coded local copy.
  let parts = await fetch(chrome.runtime.getURL("body-parts.json")).then(
    (res) => res.json()
  );

  for (let i in parts) {
    bodyPartsMap[parts[i].partId] = parts[i];
  }
}

var svgsMap = null;
async function getSVGs(cb) {
  if (svgsMap) {
    cb(svgsMap);
    return;
  }

  let svgs = await fetch(chrome.extension.getURL("svgs.json")).then((res) =>
    res.json()
  );

  cb(svgs);
}

function addClass(classCt, className) {
  if (classCt[className] == null) {
    classCt[className] = 0;
  }

  classCt[className] += 1;
}

function checkSecondaryClassPureness(classCt, traits) {
  let max = 0;
  let secondaryClass = null;
  for (let i in classCt) {
    if (classCt[i] > max) {
      max = classCt[i];
      secondaryClass = i;
    }
  }

  return getQualityAndPureness(traits, secondaryClass, true);
}

function getQualityAndPureness(traits, cls, ignoreSecondary) {
  let quality = 0;
  let dPureness = 0;
  let classCt = {};
  for (let i in parts) {
    addClass(classCt, traits[parts[i]].d.class);
    if (traits[parts[i]].d.class == cls) {
      quality += PROBABILITIES.d;
      dPureness++;
    }
    addClass(classCt, traits[parts[i]].r1.class);
    if (traits[parts[i]].r1.class == cls) {
      quality += PROBABILITIES.r1;
    }
    addClass(classCt, traits[parts[i]].r2.class);
    if (traits[parts[i]].r2.class == cls) {
      quality += PROBABILITIES.r2;
    }
  }

  let secondaryScore = { quality: 0 };
  if (!ignoreSecondary) {
    secondaryScore = checkSecondaryClassPureness(classCt, traits);
  }

  return {
    quality: quality / MAX_QUALITY,
    pureness: dPureness,
    secondary: secondaryScore.quality,
  };
}

function strMul(str, num) {
  var s = "";
  for (var i = 0; i < num; i++) {
    s += str;
  }
  return s;
}

function genesToBin(genes) {
  var genesString = genes.toString(2);
  genesString = strMul("0", 256 - genesString.length) + genesString;
  return genesString;
}

const regionGeneMap = { "00000": "global", "00001": "japan" };
function getRegionFromGroup(group) {
  let regionBin = group.slice(8, 13);
  if (regionBin in regionGeneMap) {
    return regionGeneMap[regionBin];
  }
  return "Unknown Region";
}

function getClassFromGroup(group) {
  let bin = group.slice(0, 4);
  if (!(bin in classGeneMap)) {
    return "Unknown Class";
  }
  return classGeneMap[bin];
}

function getPatternsFromGroup(group) {
  //patterns could be 6 bits. use 4 for now
  return {
    d: group.slice(2, 8),
    r1: group.slice(8, 14),
    r2: group.slice(14, 20),
  };
}

function getColor(bin, cls) {
  let color;
  if (bin == "0000") {
    color = "ffffff";
  } else if (bin == "0001") {
    color = "7a6767";
  } else {
    color = geneColorMap[cls][bin];
  }
  return color;
}

function getColorsFromGroup(group, cls) {
  return {
    d: getColor(group.slice(20, 24), cls),
    r1: getColor(group.slice(24, 28), cls),
    r2: getColor(group.slice(28, 32), cls),
  };
}

//hack. key: part name + " " + part type
var partsClassMap = {};
function getPartName(cls, part, region, binary, skinBinary = "00") {
  let trait;
  if (binary in binarytraits[cls][part]) {
    if (skinBinary == "11") {
      trait = binarytraits[cls][part][binary]["mystic"];
    } else if (skinBinary == "10") {
      trait = binarytraits[cls][part][binary]["xmas"];
    } else if (region in binarytraits[cls][part][binary]) {
      trait = binarytraits[cls][part][binary][region];
    } else if ("global" in binarytraits[cls][part][binary]) {
      trait = binarytraits[cls][part][binary]["global"];
    } else {
      trait = "UNKNOWN Regional " + cls + " " + part;
    }
  } else {
    trait = "UNKNOWN " + cls + " " + part;
  }
  //return part + "-" + trait.toLowerCase().replace(/\s/g, "-");
  partsClassMap[trait + " " + part] = cls;
  return trait;
}

function getPartsFromGroup(part, group, region) {
  let skinBinary = group.slice(0, 2);
  let mystic = skinBinary == "11";
  let dClass = classGeneMap[group.slice(2, 6)];
  let dBin = group.slice(6, 12);
  let dName = getPartName(dClass, part, region, dBin, skinBinary);

  let r1Class = classGeneMap[group.slice(12, 16)];
  let r1Bin = group.slice(16, 22);
  let r1Name = getPartName(r1Class, part, region, r1Bin);

  let r2Class = classGeneMap[group.slice(22, 26)];
  let r2Bin = group.slice(26, 32);
  let r2Name = getPartName(r2Class, part, region, r2Bin);

  return {
    d: getPartFromName(part, dName),
    r1: getPartFromName(part, r1Name),
    r2: getPartFromName(part, r2Name),
    mystic: mystic,
  };
}

function getTraits(genes) {
  var groups = [
    genes.slice(0, 32),
    genes.slice(32, 64),
    genes.slice(64, 96),
    genes.slice(96, 128),
    genes.slice(128, 160),
    genes.slice(160, 192),
    genes.slice(192, 224),
    genes.slice(224, 256),
  ];
  let cls = getClassFromGroup(groups[0]);
  let region = getRegionFromGroup(groups[0]);
  let pattern = getPatternsFromGroup(groups[1]);
  let color = getColorsFromGroup(groups[1], groups[0].slice(0, 4));
  let eyes = getPartsFromGroup("eyes", groups[2], region);
  let mouth = getPartsFromGroup("mouth", groups[3], region);
  let ears = getPartsFromGroup("ears", groups[4], region);
  let horn = getPartsFromGroup("horn", groups[5], region);
  let back = getPartsFromGroup("back", groups[6], region);
  let tail = getPartsFromGroup("tail", groups[7], region);
  return {
    cls: cls,
    region: region,
    pattern: pattern,
    color: color,
    eyes: eyes,
    mouth: mouth,
    ears: ears,
    horn: horn,
    back: back,
    tail: tail,
  };
}

function getPartFromName(traitType, partName) {
  let traitId =
    traitType.toLowerCase() +
    "-" +
    partName
      .toLowerCase()
      .replace(/\s/g, "-")
      .replace(/[\?'\.]/g, "");
  return bodyPartsMap[traitId];
}

function checkStatus(res) {
  if (res.ok) {
    return res;
  } else {
    throw Exception("Failed to get axie details: " + res);
  }
}

//Assume we are on https://marketplace.axieinfinity.com/profile/inventory/axie
async function getAccountFromProfile() {
  let axieAnchors = document.querySelectorAll("a[href^='/axie/']");
  if (axieAnchors.length > 0) {
    let anc = axieAnchors[0];
    let axieId = parseInt(getAxieIdFromHref(anc.href));
    let axie = await getAxieInfoMarket(axieId);
    //this will return the 0x formatted ronin address
    return axie.owner;
  }
  return null;
}

function getAccount() {
  //https://marketplace.axieinfinity.com/profile/0x.../axie
  //https://marketplace.axieinfinity.com/profile/ronin:.../axie
  let checkIndex = "https://marketplace.axieinfinity.com/profile/".length;
  let start = window.location.href.slice(
    "https://marketplace.axieinfinity.com/profile/".length
  );
  let account = start.slice(0, start.indexOf("/"));
  if (account.startsWith("ronin:")) {
    account = account.replace("ronin:", "0x");
  } else {
    //0xaddress. TODO: get ronin address from eth addr
  }
  //TODO: validate address
  if (account !== "") {
    return account;
  }
  return null;
}

function getQueryParameters(name) {
  let query = window.location.search.substring(1);
  let vars = query.split("&");
  let result = [];
  for (var i = 0; i < vars.length; i++) {
    let pair = vars[i].split("=");
    if (pair[0] == name) {
      result.push(pair[1]);
    }
  }
  return result;
}

function getAxieInfoMarket(id) {
  debugLog("getAxieInfoMarket", id);
  return new Promise((resolve, reject) => {
    if (id in axies) {
      resolve(axies[id]);
    } else {
      axies[id] = {}; //kind of mutex
      try {
        chrome.runtime.sendMessage(
          { contentScriptQuery: "getAxieInfoMarket", axieId: id },
          function (result) {
            if (!result) {
              return;
            }

            //console.log("From fetch: ", result);
            axies[id] = result;
            if (result && result["stage"] && result.stage > 2) {
              axies[id].genes = genesToBin(BigInt(axies[id].genes));
              let traits = getTraits(axies[id].genes);
              let qp = getQualityAndPureness(
                traits,
                axies[id].class.toLowerCase(),
                false
              );
              axies[id].traits = traits;
              axies[id].quality = qp.quality;
              axies[id].pureness = qp.pureness;
              axies[id].secondary = qp.secondary;
            }
            resolve(result);
          }
        );
      } catch (ex) {}
    }
  });
}

function invalidateAxieInfoMarketCB(id, cb) {
  debugLog("invalidateAxieInfoMarket", id);
  axies[id] = {}; //kind of mutex
  try {
    chrome.runtime.sendMessage(
      { contentScriptQuery: "invalidateAxieInfoMarket", axieId: id },
      function (result) {
        //console.log("From fetch: ", result);
        axies[id] = result;
        if (result && result["stage"] && result.stage > 2) {
          axies[id].genes = genesToBin(BigInt(axies[id].genes));
          let traits = getTraits(axies[id].genes);
          let qp = getQualityAndPureness(
            traits,
            axies[id].class.toLowerCase(),
            false
          );
          axies[id].traits = traits;
          axies[id].quality = qp.quality;
          axies[id].pureness = qp.pureness;
          axies[id].secondary = qp.secondary;
        }
        cb(result);
      }
    );
  } catch (ex) {}
}

function buggedAxieInfoMarketCB(id, price, cb) {
  debugLog("buggedAxieInfoMarket", id);
  try {
    chrome.runtime.sendMessage(
      { contentScriptQuery: "buggedAxieInfoMarket", axieId: id, price: price },
      function (result) {
        console.log("From bugged fetch: ", id, result);
        axies[id].bugged = result.bugged;
        axies[id].bugged_price = result.bugged_price;
        if (cb) {
          cb(result);
        }
      }
    );
  } catch (ex) {}
}

function getParentAxieDataCB(id, context, matron, sire, cb) {
  debugLog("getParentAxieData", id);
  getAxieInfoMarketCB(matron, function (matronResult) {
    getAxieInfoMarketCB(sire, function (sireResult) {
      cb(id, context, matronResult, sireResult);
    });
  });
}

function getAxieInfoMarketCB(id, cb, renderEggDetails) {
  //console.log("getAxieInfoMarketCB", id);
  if (id in axies && axies[id].story_id) {
    cb(axies[id]);
    // Check to see if the want parental details.
    if (axies[id].stage <= 2) {
      if (renderEggDetails) {
        getParentAxieDataCB(
          id,
          renderEggDetails,
          axies[id].matronId,
          axies[id].sireId,
          function (id, context, matron, sire) {
            context(id, matron, sire);
          }
        );
      }
    }
  } else {
    axies[id] = {}; //kind of mutex
    setTimeout(() => {
      // Give it a little space around in the time.
      try {
        chrome.runtime.sendMessage(
          { contentScriptQuery: "getAxieInfoMarket", axieId: id },
          function (result) {
            if (!result) return;

            axies[id] = result;
            if (result.stage > 2) {
              axies[id].genes = genesToBin(BigInt(axies[id].genes));
              let traits = getTraits(axies[id].genes);
              let qp = getQualityAndPureness(
                traits,
                axies[id].class.toLowerCase(),
                false
              );
              axies[id].traits = traits;
              axies[id].quality = qp.quality;
              axies[id].pureness = qp.pureness;
              axies[id].secondary = qp.secondary;
            } else {
              // Check to see if the want parental details.
              if (renderEggDetails) {
                getParentAxieDataCB(
                  id,
                  renderEggDetails,
                  axies[id].matronId,
                  axies[id].sireId,
                  function (id, context, matron, sire) {
                    context(id, matron, sire);
                  }
                );
              }
            }
            if (cb) {
              cb(result);
            }
          }
        );
      } catch (Ex) {}
    }, Math.random() * 500);
  }
}
function getAxieInfoMarketBulk(ids, renderEggDetails) {
  debugLog("getAxieInfoMarketBulk", ids);
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(
        { contentScriptQuery: "getAxieInfoMarketBulk", axieIds: ids },
        function (results) {
          //console.log("Bulk call:", results);
          for (let i = 0; i < results.length; i++) {
            let id = null;
            if (results[i] && results[i].story_id) {
              id = results[i].story_id;
              axies[id] = results[i];
            } else {
              continue;
            }

            if (results[i].stage > 2) {
              axies[id].genes = genesToBin(BigInt(axies[id].genes));
              let traits = getTraits(axies[id].genes);
              let qp = getQualityAndPureness(
                traits,
                axies[id].class.toLowerCase(),
                false
              );
              axies[id].traits = traits;
              axies[id].quality = qp.quality;
              axies[id].pureness = qp.pureness;
              axies[id].secondary = qp.secondary;
            } else {
              // Check to see if the want parental details.
              if (renderEggDetails) {
                getParentAxieDataCB(
                  id,
                  renderEggDetails,
                  axies[id].matronId,
                  axies[id].sireId,
                  function (id, context, matron, sire) {
                    context(id, matron, sire);
                  }
                );
              }
            }
          }
          resolve(axies);
        }
      );
    } catch (Ex) {
      reject(Ex);
    }
  });
}

function getAxieInfoMarketBulkCB(ids, cb, renderEggDetails) {
  debugLog("getAxieInfoMarketBulkCB", ids);
  try {
    chrome.runtime.sendMessage(
      { contentScriptQuery: "getAxieInfoMarketBulk", axieIds: ids },
      function (results) {
        //console.log("Bulk call:", results);
        for (let i = 0; i < results.length; i++) {
          let id = null;
          if (results[i] && results[i].story_id) {
            id = results[i].story_id;
            axies[id] = results[i];
          } else {
            continue;
          }

          if (results[i].stage > 2) {
            axies[id].genes = genesToBin(BigInt(axies[id].genes));
            let traits = getTraits(axies[id].genes);
            let qp = getQualityAndPureness(
              traits,
              axies[id].class.toLowerCase(),
              false
            );
            axies[id].traits = traits;
            axies[id].quality = qp.quality;
            axies[id].pureness = qp.pureness;
            axies[id].secondary = qp.secondary;
          } else {
            // Check to see if the want parental details.
            if (renderEggDetails) {
              getParentAxieDataCB(
                id,
                renderEggDetails,
                axies[id].matronId,
                axies[id].sireId,
                function (id, context, matron, sire) {
                  context(id, matron, sire);
                }
              );
            }
          }
          if (cb) {
            cb(results);
          }
        }
      }
    );
  } catch (Ex) {}
}

function appendTrait(table, trait) {
  let row = document.createElement("tr");
  let mystic = trait["mystic"];
  for (let position in trait) {
    if (position == "mystic") continue;
    let data = document.createElement("td");
    let span = document.createElement("span");
    if (trait[position].hasOwnProperty("class")) {
      span.style.color = colorMap[trait[position].class];
    }
    span.textContent = trait[position].name;
    if (position == "d" && mystic) {
      span.textContent += "*";
    }
    data.style["padding-right"] = "5px";
    data.appendChild(span);
    row.appendChild(data);
  }
  table.appendChild(row);
}

function appendRow(table, text) {
  let row = document.createElement("tr");
  let data = document.createElement("td");
  let span = document.createElement("span");
  span.textContent = text;
  data.colSpan = 2;
  data.style["padding-right"] = "5px";
  data.appendChild(span);
  row.appendChild(data);
  table.appendChild(row);
}

function genGenesDiv(axie, mouseOverNode, type = "list", showBody = false) {
  let traits = document.createElement("div");
  let table = document.createElement("table");
  appendTrait(table, {
    d: { name: "D" },
    r1: { name: "R1" },
    r2: { name: "R2" },
  });
  appendTrait(table, axie.traits.eyes);
  appendTrait(table, axie.traits.ears);
  appendTrait(table, axie.traits.mouth);
  appendTrait(table, axie.traits.horn);
  appendTrait(table, axie.traits.back);
  appendTrait(table, axie.traits.tail);

  if (showBody) {
    appendRow(table, "Body Type: " + axie.bodyShape);
  }

  traits.appendChild(table);
  if (mouseOverNode) {
    traits.style.display = "none";
    traits.style.position = "absolute";
    traits.style["z-index"] = "9999";
  } else {
    traits.style["margin-right"] = "15px";
  }
  traits.style.border = "grey";
  traits.style["border-style"] = "solid";
  traits.style["border-width"] = "1px";
  traits.style["border-radius"] = "20px";
  traits.style["white-space"] = "nowrap";
  traits.style["padding-left"] = "10px";
  traits.style["padding-top"] = "10px";
  traits.style["padding-bottom"] = "10px";
  traits.style["padding-right"] = "10px";

  if (currentURL.startsWith("https://marketplace.axieinfinity.com/")) {
    traits.style.background = "var(--color-gray-5)";
    traits.style.top = "-85px";
    if (type == "list") {
      if (axie.stage == 3) {
        traits.style.top = "-85px";
      }
      traits.style.left = "0px";
    } else if (type == "details") {
      traits.style.left = "auto";
      traits.style.top = "auto";
    }
  } else {
    traits.style.background = "white";
    //traits.style.background = window.getComputedStyle(document.getRootNode().body, null).getPropertyValue("background-color");
    traits.style.top = "-90px";
    if (type == "list") {
      if (axie.stage == 3) {
        traits.style.top = "-90px";
      }
      traits.style.left = "-18px";
    } else if (type == "details") {
      traits.style.left = "0px";
    }
  }

  if (mouseOverNode) {
    mouseOverNode.addEventListener("mouseover", function () {
      traits.style.display = "block";
    });
    mouseOverNode.addEventListener("mouseout", function () {
      traits.style.display = "none";
    });
  }
  return traits;
}

let readyToMorph = [];
function clearMorphDiv() {
  readyToMorph = [];
  let m = document.getElementById("morphinButton");
  if (m) {
    m.remove();
  }
}

function clearUpdateDiv() {
  let m = document.getElementById("updateButton");
  if (m) {
    m.remove();
  }
}

function genUpdateDiv(axie) {
  let updateDiv = document.getElementById("updateButton");
  if (updateDiv == null) {
    updateDiv = document.createElement("div");
    updateDiv.id = "updateButton";
    updateDiv.style.position = "absolute";
    updateDiv.style.right = "0px";
    updateDiv.style.margin = "5px";
    updateDiv.style.paddingRight = "30px";
    updateDiv.style.paddingTop = "3px";

    let topBar = document.getElementsByClassName("fixed")[3];
    if (!topBar || !topBar.firstChild) return;

    topBar.insertBefore(updateDiv, topBar.firstChild);

    let button = document.createElement("button");
    button.classList.add(
      "px-20",
      "py-8",
      "relative",
      "rounded",
      "transition",
      "focus:outline-none",
      "border",
      "text-white",
      "border-primary-4",
      "hover:border-primary-3",
      "active:border-primary-5",
      "bg-primary-4",
      "hover:bg-primary-3",
      "active:bg-primary-5"
    );
    button.title =
      "Founder's cache out of date on this axie?  Click this to force a refresh.";
    button.style.opacity = ".4";
    updateDiv.appendChild(button);

    let span = document.createElement("span");
    span.classList.add("visible");
    button.appendChild(span);

    let div = document.createElement("div");
    div.classList.add("flex", "items-center");
    span.appendChild(div);

    let textDiv = document.createElement("div");
    textDiv.textContent = "Recache";
    div.appendChild(textDiv);

    button.addEventListener("click", () => {
      textDiv.textContent = "Working...";
      invalidateAxieInfoMarketCB(axie.id, () => {
        textDiv.textContent = "Updated!";
        setTimeout(clearUpdateDiv, 500);
      });
    });
  }
}

function genMorphDiv(axie) {
  let morphDiv = document.getElementById("morphinButton");
  if (morphDiv == null) {
    morphDiv = document.createElement("div");
    morphDiv.style.position = "relative";
    morphDiv.style.right = "0px";
    morphDiv.style.margin = "5px";
    morphDiv.style.paddingRight = "30px";
    morphDiv.style.paddingTop = "3px";
    morphDiv.style.float = "right";
    morphDiv.id = "morphinButton";

    let fixedBars = document.getElementsByClassName("fixed");
    if (!fixedBars || fixedBars.length < 4) {
      fixedBars = document.getElementsByClassName("border-b");
      if (!fixedBars || fixedBars.length < 2) return;
      fixedBar = fixedBars[0];
      fixedBars = [];
      fixedBars[3] = fixedBar;
    }

    let topBar = fixedBars[3];
    topBar.insertBefore(morphDiv, topBar.firstChild);

    let button = document.createElement("button");
    button.classList.add(
      "px-20",
      "py-8",
      "relative",
      "rounded",
      "transition",
      "focus:outline-none",
      "border",
      "text-white",
      "border-primary-4",
      "hover:border-primary-3",
      "active:border-primary-5",
      "bg-primary-4",
      "hover:bg-primary-3",
      "active:bg-primary-5"
    );
    morphDiv.appendChild(button);
    button.title = "Click this button to open morphable eggs in tabs.";
    button.style.opacity = ".5";

    let span = document.createElement("span");
    span.classList.add("visible");
    button.appendChild(span);

    let div = document.createElement("div");
    div.classList.add("flex", "items-center");
    span.appendChild(div);

    let textDiv = document.createElement("div");
    textDiv.textContent = "Open Morphables";
    div.appendChild(textDiv);

    button.addEventListener("click", () => {
      for (let i = 0; i < readyToMorph.length; i++) {
        window.open(
          "https://marketplace.axieinfinity.com/axie/" + readyToMorph[i].id
        );
      }
    });
  }

  readyToMorph.push(axie);
}

function insertAfter(newNode, referenceNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function checkSetHatchTime(elem, text) {
  if (!options.axieEx_minimal) {
    elem.textContent = text;
  }
}

function renderCard(anc, axie) {
  if (
    !anc ||
    !anc.firstElementChild ||
    !anc.firstElementChild.firstElementChild
  ) {
    return;
  }

  let card = anc.firstElementChild.firstElementChild.firstElementChild;
  if (!axie) {
    return;
  }

  if (options[SHOW_BREEDS_STATS_OPTION]) {
    dbg = anc;
    if (!card.children || (card.children && card.children.length < 2)) {
      //igoring showing stats on children for now
      return;
    }
    let content = card.children[2];
    let statsDiv = document.createElement("div");
    let purity = Math.round(axie.quality * 100);
    let secondary = Math.round(axie.secondary * 100);
    if (
      (purity >= options.axieEx_fireThreshold && purity < 100) ||
      (secondary >= options.axieEx_fireThreshold && secondary < 100)
    ) {
      let imgHolders = anc.querySelectorAll("img");
      let imgHolder = null;
      for (let i = 0; i < imgHolders.length; i++) {
        if (imgHolders[i].src.match(/.*transparent.*/)) {
          imgHolder = imgHolders[i];
          break;
        }
      }

      if (imgHolder) {
        imgHolder.style["background-image"] =
          "url(https://imagewerks.s3.us-west-2.amazonaws.com/BJy7iy6Tb/770159246796128258.png)";
        imgHolder.style["background-position-x"] = "122px";
        imgHolder.style["background-position-y"] = "71px";
        imgHolder.style["background-size"] = "39%";
        imgHolder.style["background-repeat"] = "no-repeat";
        if (options.axieEx_minimal) {
          imgHolder.style["background-image"] =
            "url(https://i.imgur.com/gOLXyOa.png)";
          imgHolder.style["background-position-x"] = "0px";
          imgHolder.style["background-position-y"] = "0px";
          imgHolder.style["background-size"] = "10%";
          imgHolder.style["background-repeat"] = "no-repeat";
        }
      }
    } else if (purity == 100 || secondary == 100) {
      let imgHolders = anc.querySelectorAll("img");
      let imgHolder = null;
      for (let i = 0; i < imgHolders.length; i++) {
        if (imgHolders[i].src.match(/.*transparent.*/)) {
          imgHolder = imgHolders[i];
          break;
        }
      }

      if (imgHolder) {
        imgHolder.style["background-image"] =
          "url(https://imagewerks.s3.us-west-2.amazonaws.com/BJy7iy6Tb/XDZT.gif)";
        imgHolder.style["background-position-x"] = "112px";
        imgHolder.style["background-position-y"] = "75px";
        imgHolder.style["background-size"] = "70%";
        imgHolder.style["background-repeat"] = "no-repeat";
        if (options.axieEx_minimal) {
          imgHolder.style["background-image"] =
            "url(https://i.imgur.com/gOLXyOa.png)";
          imgHolder.style["background-position-x"] = "0px";
          imgHolder.style["background-position-y"] = "0px";
          imgHolder.style["background-size"] = "10%";
          imgHolder.style["background-repeat"] = "no-repeat";
        }
      }
    }

    if (!options.axieEx_minimal) {
      if (axie.bugged) {
        let h5s = anc.getElementsByTagName("h5");
        if (h5s.length == 1) {
          let priceDetails = h5s[0].textContent;
          let priceParts = priceDetails.split(/\s+/);
          if (priceParts.length > 1) {
            if (priceParts[1] + 0 <= axie.bugged_price) {
              h5s[0].textContent += "🐞";
            }
          }
        }
      }
    }

    let breedHolder = anc.getElementsByTagName("small");
    // Check to see if this is the second call.
    if (breedHolder[1].classList.contains("smalldetails")) {
      return;
    }

    breedCount = breedHolder[1].innerText;
    breedCount = breedCount.replace(/.*:/, "") - 0;

    breedHolder[1].classList.add("smalldetails");
    if (options.axieEx_minimal) {
      breedHolder[1].style.color = "light-grey";
    } else {
      breedHolder[1].style.color = "white";
    }

    let stats = "";
    if (axie.stats && axie.stats.hp) {
      stats =
        "H:" +
        axie.stats.hp +
        " S:" +
        axie.stats.speed +
        " S:" +
        axie.stats.skill +
        " M:" +
        axie.stats.morale +
        " P:" +
        purity +
        "";
      if (purity != 100 && secondary != purity) {
        stats += " S:" + secondary + "";
      } else {
        stats += "%";
      }

      if (options.axieEx_minimal) {
        stats =
          "H:" +
          axie.stats.hp +
          " S:" +
          axie.stats.speed +
          " S:" +
          axie.stats.skill +
          " M:" +
          axie.stats.morale +
          " P:" +
          secondary +
          "%";
      }
    }

    content.className = card.children[2].className;
    if (axie.stage == 3) {
      statsDiv.textContent = stats;
      content.className = content.className.replace("invisible", "visible");
    } else if (axie.stage > 3) {
      content.childNodes.forEach((n) => {
        if (n.nodeType == Node.TEXT_NODE) {
          n.textContent = "";
          //n.remove() doesn't work. probably because removing during iteration is not supported.
        }
      });

      statsDiv.textContent = "🍆" + breedCount + " " + stats;
      if (breedCount == 0 && !options.axieEx_minimal) {
        statsDiv.textContent = "🥚" + " " + stats;
      }

      if (!options.axieEx_minimal) {
        statsDiv.title =
          breedCount +
          " - Breeds, H - health, S - speed, S - Skill, M - morale, P% - Purity, S% - Secondary Purity";
      }
    } else if (axie.stage < 3) {
      birthTime = new Date(axie.birthDate * 1000 + 5 * 86400000);
      timeToBirth = birthTime.getTime() - new Date().getTime();
      timeToHatch = (
        new Date(axie.birthDate * 1000 + 5 * 86400000) + ""
      ).replace(/GMT.*/, "");

      var timerCheck;
      if (options.axieEx_minimal && isProfilePage()) {
        timerCheck = 1;
        breedHolder[1].textContent = timeToHatch;
      } else {
        timerCheck = 86400000;
        timeToHatch = timeToHatch.replace(/202\d.*/, "");
        breedHolder[1].textContent = "Hatch: " + timeToHatch;
      }

      if (timeToBirth < timerCheck) {
        //console.log(timeToBirth);
        minutesToBirth = Math.floor(timeToBirth / 1000 / 60);
        hoursToBirth = Math.floor(minutesToBirth / 60);

        if (minutesToBirth <= 60) {
          if (minutesToBirth < 0) {
            checkSetHatchTime(breedHolder[1], "Hatch: Ready!");
            genMorphDiv(axie);
          } else {
            checkSetHatchTime(
              breedHolder[1],
              "Hatch: " + minutesToBirth + " Min"
            );
          }
        } else {
          checkSetHatchTime(breedHolder[1], "Hatch: " + hoursToBirth + " Hrs");
        }

        if (breedHolder[1].getAttribute("eggDetails")) {
          breedHolder[1].textContent =
            breedHolder[1].textContent +
            breedHolder[1].getAttribute("eggDetails");
        }

        let imgHolder = anc.querySelector(".img-placeholder");
        if (imgHolder) {
          imgHolder.style["background-image"] =
            "url(https://imagewerks.s3.us-west-2.amazonaws.com/BJy7iy6Tb/pngaaa.com-1654773.png)";
          imgHolder.style["background-position-x"] = "117px";
          imgHolder.style["background-position-y"] = "68px";
          imgHolder.style["background-size"] = "80%";
          imgHolder.style["background-repeat"] = "no-repeat";
          if (options.axieEx_minimal) {
            imgHolder.style["background-image"] =
              "url(https://i.imgur.com/gOLXyOa.png)";
            imgHolder.style["background-position-x"] = "0px";
            imgHolder.style["background-position-y"] = "0px";
            imgHolder.style["background-size"] = "10%";
            imgHolder.style["background-repeat"] = "no-repeat";
          }
        }
      }
      content.className = content.className.replace("invisible", "visible");
    }

    if (axie.auction && options.axieEx_auction) {
      let auctionHolder = breedHolder[1].cloneNode(true);
      auctionHolder.style.textAlign = "center";
      auctionHolder.classList.add("auctionBucket");

      timeTotal = (
        (axie.auction.endingTimestamp - axie.auction.startingTimestamp) /
        60 /
        60
      ).toFixed(1);
      timeLeft = (
        (axie.auction.endingTimestamp * 1000 - new Date().getTime()) /
        1000 /
        60 /
        60
      ).toFixed(1);
      if (timeLeft < 0) {
        timeLeft = 0;
      }

      startPrice = (axie.auction.startingPrice / 1000000000000000000).toFixed(
        4
      );
      endingPrice = (axie.auction.endingPrice / 1000000000000000000).toFixed(4);
      auctionHolder.textContent =
        startPrice +
        " / " +
        endingPrice +
        " / " +
        timeLeft +
        ":" +
        timeTotal +
        "h";
      parentNode = breedHolder[1].parentNode;
      if (
        startPrice != endingPrice &&
        parentNode.getElementsByClassName("auctionBucket").length == 0
      ) {
        parentNode.append(auctionHolder);
        parentNode.style.paddingBottom = "2px";
      }
    }

    //prevent dupes
    if (axie.stage > 2 && content.childElementCount == 0) {
      let traits = genGenesDiv(axie, statsDiv);
      content.appendChild(statsDiv);
      content.appendChild(traits);
      //remove part's box margin to prevent overlap with price
      content.style["margin-top"] = "0px";
      card.style["position"] = "relative"; //will this mess shit up?

      let marketDiv = buildSearchLink(axie);
      let idHolder = anc.querySelector("span.flex");
      if (idHolder) {
        idHolder.parentElement.parentElement.appendChild(marketDiv);
      }
    }
  }
}

// Render the details of the parent.
function renderEggCard(anc, matron, sire, attempt) {
  if (!attempt) {
    attempt = 1;
  }

  if (attempt > 15) {
    //Bail.
    console.log("Giving up on adding egg details");
    return;
  }

  let smallDetails = anc.getElementsByClassName("smalldetails");
  if (smallDetails && smallDetails.length >= 1) {
    let smallDetail = smallDetails[0];
    if (smallDetail) {
      let matronQuality = Math.floor(matron.quality * 100);
      let sireQuality = Math.floor(sire.quality * 100);
      smallDetail.textContent =
        smallDetail.textContent +
        " - M: " +
        matronQuality +
        "% S: " +
        sireQuality +
        "%";
      smallDetail.setAttribute(
        "eggDetails",
        " - M: " + matronQuality + "% S: " + sireQuality + "%"
      );
      if (!options.axieEx_minimal)
        smallDetail.title = "M is matron quality, and S is Sire quality.";
      if (matronQuality > 97 && sireQuality > 97) {
        smallDetail.style.color = "green";
      }
    }
  } else {
    setTimeout(() => {
      attempt += 1;
      renderEggCard(anc, matron, sire, attempt);
    }, 300);
  }
}

function buildSearchLink(axie) {
  let marketDiv = document.createElement("div");
  let marketH = document.createElement("a");
  marketH.href =
    `https://marketplace.axieinfinity.com/axie?class=${axie.class}&part=${axie.traits.back.d.partId}` +
    `&part=${axie.traits.mouth.d.partId}&part=${axie.traits.horn.d.partId}&part=${axie.traits.tail.d.partId}` +
    `&breedCount=${axie.breedCount}&breedCount=${axie.breedCount}`;
  marketH.alt = "See more like this...";
  marketH.target = "_blank";
  marketH.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  marketDiv.appendChild(marketH);
  marketIcon = document.createElement("img");
  marketIcon.src =
    "https://imagewerks.s3.us-west-2.amazonaws.com/BJy7iy6Tb/market.png";
  marketIcon.style.maxHeight = "23px";
  marketH.appendChild(marketIcon);
  return marketDiv;
}

function setupCart() {
  let cards = document.getElementsByClassName("axie-card");
  for (let i = 0; i < cards.length; i++) {
    if (!cards[i].getAttribute("draggable")) {
      cards[i].setAttribute("draggable", true);
      cards[i].addEventListener("dragstart", drag);
      cards[i].addEventListener("dragend", dragend);
      cards[i].id = cards[i].parentElement.href;
    }
  }

  if (!document.getElementById("cartdropzone")) {
    let leftTray = document.getElementsByClassName("pb-32 w-full")[0];
    if (leftTray) {
      let targetDiv = document.createElement("div");

      targetDiv.style["min-height"] = "100px";
      targetDiv.style["overflow-y"] = "auto";
      targetDiv.id = "cartdropzone";

      leftTray.appendChild(targetDiv);
      leftTray.firstChild.style["margin-bottom"] = "0px";
      leftTray.firstChild.style["padding-bottom"] = "0px";

      targetDiv.addEventListener("drop", drop);
      targetDiv.addEventListener("dragover", allowDrop);
      targetDiv.addEventListener("dragleave", dragLeave);
      targetDiv.classList.add("dragtarget");
      setTimeout(() => {
        targetDiv.style.maxHeight =
          window.innerHeight - targetDiv.offsetTop - 10 + "px";
      }, 100);
    }
  }
}

function setupAxiePost() {
  if (!document.getElementById("postdropzone")) {
    let targetDiv = document.createElement("div");

    targetDiv.style["height"] = "300px";
    targetDiv.style["width"] = "30px";
    targetDiv.style["overflow"] = "hidden";
    targetDiv.id = "postdropzone";
    targetDiv.style.position = "fixed";
    targetDiv.style.top = "500px";
    targetDiv.style.right = "20px";
    targetDiv.style.writingMode = "vertical-rl";
    targetDiv.style.textOrientation = "sideways-right";
    targetDiv.title = "Drag and drop two axies here to start the Breeding Sim.";

    if (!options.axieEx_minimal) {
      textClone = targetDiv.cloneNode();
      textClone.innerText = "Breeding Simulator";
      document.body.appendChild(textClone);
    }

    document.body.appendChild(targetDiv);

    targetDiv.addEventListener("drop", postAxie);
    targetDiv.addEventListener("dragover", allowDrop);
    targetDiv.addEventListener("dragleave", dragLeave);
    targetDiv.classList.add("dragtarget");
    targetDiv.classList.add("hideme");
  }
}

function allowDrop(ev) {
  //console.log("allowDrop")
  ev.preventDefault();
  if (ev.target.id == "cartdropzone") {
    ev.target.style.border = "3px solid green";
  }
  if (ev.target.id == "postdropzone") {
    ev.target.style.border = "3px solid green";
  }
}

function drag(ev) {
  ev.dataTransfer.setData("text/plain", ev.target.id);

  let targets = document.getElementsByClassName("dragtarget");
  for (target in targets) {
    if (targets[target] && targets[target].style) {
      targets[target].style.border = "1px solid blue";
    }
  }
}

function dragend(ev) {
  let targets = document.getElementsByClassName("dragtarget");
  for (target in targets) {
    if (targets[target] && targets[target].style) {
      targets[target].style.border = "";
      if (targets[target].classList.contains("hideme")) {
      }
    }
  }
}

function dragLeave(ev) {
  //console.log(ev.target.src)
  ev.target.style.border = "";
}

function buildShelfButtons() {
  let shelf = document.getElementById("shelf");
  if (!shelf) {
    shelf = document.createElement("div");
    shelf.style.margin = "5px";
    shelf.style.paddingRight = "3px";
    shelf.style.paddingTop = "3px";
    shelf.id = "shelf";

    let button = document.createElement("button");
    button.classList.add(
      "px-20",
      "py-2",
      "relative",
      "rounded",
      "transition",
      "focus:outline-none",
      "border",
      "text-white",
      "border-primary-4",
      "hover:border-primary-3",
      "active:border-primary-5",
      "bg-primary-4",
      "hover:bg-primary-3",
      "active:bg-primary-5"
    );
    shelf.appendChild(button);
    button.title = "Click this button to open these axies.";

    let span = document.createElement("span");
    span.classList.add("visible");
    button.appendChild(span);

    let div = document.createElement("div");
    div.classList.add("flex", "items-center");
    span.appendChild(div);

    let textDiv = document.createElement("div");
    textDiv.textContent = "Open Axies";
    div.appendChild(textDiv);

    button.addEventListener("click", () => {
      let allAxies = document.getElementsByClassName("cartaxie");
      for (let i = 0; i < allAxies.length; i++) {
        window.open(allAxies[i].getAttribute("href"));
      }
    });

    let leftTray = document.getElementsByClassName("pb-32 w-full")[0];
    let dropZone = document.getElementById("cartdropzone");

    leftTray.insertBefore(shelf, dropZone);
  }
}

function getAxieIdFromHref(href) {
  let axieId = href.replace(/.*axie.(\d+).*/, "$1");
  if (isNaN(axieId) || axieId == "") {
    return "";
  } else {
    return axieId;
  }
}

function addCartAxie(axieId) {
  let cartAxies = [];
  if (localStorage.cartAxies == null || localStorage.cartAxies == "") {
    localStorage.cartAxies = JSON.stringify([]);
  } else {
    cartAxies = JSON.parse(localStorage.cartAxies);
  }

  cartAxies.unshift(axieId);
  localStorage.cartAxies = JSON.stringify(cartAxies);
}

function removeCartAxie(axieId) {
  let cartAxies = [];
  if (localStorage.cartAxies == null || localStorage.cartAxies == "") {
    localStorage.cartAxies = JSON.stringify([]);
  } else {
    cartAxies = JSON.parse(localStorage.cartAxies);
  }

  const index = cartAxies.indexOf(axieId);
  if (index > -1) {
    cartAxies.splice(index, 1);
  }
  localStorage.cartAxies = JSON.stringify(cartAxies);
}

function buildShelfAxie(axieId, classname, href, cb) {
  getAxieInfoMarketCB(axieId, (axieInfo) => {
    let itemDiv = document.createElement("div");
    itemDiv.style.maxWidth = "130px";
    itemDiv.classList.add(
      ..."border border-gray-3 bg-gray-4 rounded transition hover:shadow hover:border-gray-6".split(
        " "
      )
    );

    itemDiv.classList.add(classname);
    itemDiv.style.maxHeight = "116px";
    itemDiv.setAttribute("href", href);
    itemDiv.setAttribute("axieid", axieId);
    itemDiv.style.position = "relative";
    itemDiv.style.float = "left";
    itemDiv.addEventListener(
      "click",
      ((item) => {
        return (e) => {
          e.preventDefault();
          window.open(item.getAttribute("href"));
        };
      })(itemDiv)
    );

    let closeButton = document.createElement("div");
    closeButton.style.position = "absolute";
    closeButton.style.top = "-2px";
    closeButton.style.right = "3px";
    closeButton.style.cursor = "pointer";
    closeButton.textContent = "X";
    closeButton.style.fontWeight = "bold";
    closeButton.style.fontSize = "20px";
    itemDiv.appendChild(closeButton);

    closeButton.addEventListener(
      "click",
      ((item) => {
        return (e) => {
          e.preventDefault();
          e.stopPropagation();
          item.remove();
          removeCartAxie(axieId);
        };
      })(itemDiv)
    );

    //Add in the axie name:
    getSVGs((svgs) => {
      let axieName = document.createElement("div");
      axieName.innerHTML =
        svgs[axies[axieId].traits.cls] + " " + axies[axieId].name;
      itemDiv.appendChild(axieName);

      let sourceImg = document.createElement("img");
      sourceImg.src =
        "https://storage.googleapis.com/assets.axieinfinity.com/axies/" +
        axieId +
        "/axie/axie-full-transparent.png";
      sourceImg.style.maxHeight = "100px";
      sourceImg.style.overflow = "hidden";
      sourceImg.style.position = "relative";

      itemDiv.appendChild(sourceImg);

      if (cb) {
        cb(itemDiv);
      }
    });
  });
}

function drop(ev) {
  ev.preventDefault();
  ev.target.style.border = "";
  let target = ev.target;
  if (target.id == "cartdropzone") {
    var data = ev.dataTransfer.getData("text/plain");
    buildShelfAxie(getAxieIdFromHref(data), "cartaxie", data, (itemDiv) => {
      if (target.firstChild) {
        target.insertBefore(itemDiv, target.firstChild);
      } else {
        target.append(itemDiv);
      }

      let axieId = getAxieIdFromHref(itemDiv.getAttribute("href"));
      addCartAxie(axieId);

      buildShelfButtons();
    });
  }
}

function postAxie(ev) {
  ev.preventDefault();
  ev.target.style.border = "";

  let target = ev.target;
  console.log("Posting axie:", ev);
  var data = ev.dataTransfer.getData("text/plain");

  buildShelfAxie(getAxieIdFromHref(data), "postaxie", data, (itemDiv) => {
    if (target.firstChild) {
      target.insertBefore(itemDiv, target.firstChild);
    } else {
      target.append(itemDiv);
    }

    let readygo = null;
    let went = false;
    setTimeout(() => {
      if (document.getElementsByClassName("postaxie").length > 1) {
        let axieList = [];
        for (
          let pCt = 0;
          pCt < document.getElementsByClassName("postaxie").length;
          pCt++
        ) {
          let curItemDiv = document.getElementsByClassName("postaxie")[pCt];
          axieList.push(curItemDiv.getAttribute("axieid"));
          setTimeout(() => {
            curItemDiv.style.opacity = 1;
            let intval = setInterval(() => {
              curItemDiv.style.opacity = curItemDiv.style.opacity - 0.1;
              if (curItemDiv.style.opacity < 0.2) {
                curItemDiv.remove();
                clearInterval(intval);
                clearTimeout(readygo);
                readygo = setTimeout(() => {
                  clearTimeout(readygo);
                  if (went) return;
                  went = true;
                  window.open(
                    options[POST_ADDRESS].replace(
                      /{axieid}/,
                      axieList[0]
                    ).replace(/{axieid2}/, axieList[1])
                  );
                }, 100);
              }
            }, 100);
          }, 100);
        }
      }
    }, 0);
  });
}

function rebuildShelf() {}

function checkIsBugged(id) {
  if (isAxiePage()) {
    if (document.getElementsByClassName("text-warning-4").length > 0) {
      if (document.getElementsByTagName("h3").length == 1) {
        let priceDetails = document.getElementsByTagName("h3")[0].textContent;
        let priceParts = priceDetails.split(/\s+/);
        if (priceParts.length > 1) {
          buggedAxieInfoMarketCB(id, priceParts[1]);
        }
      }
      return true;
    }
  }
  return false;
}

function isAxiePage() {
  let pageUrl = document.location.href + "";
  return pageUrl.match(/axie.\d+/);
}

function isProfilePage() {
  let pageUrl = document.location.href + "";
  return pageUrl.match(/profile/);
}

let lastRun = 0;
async function run() {
  debugLog("run");
  let dbg;
  try {
    let axieAnchors = document.querySelectorAll("a[href^='/axie/']");
    debugLog("Axie anchors: ", axieAnchors);
    if (axieAnchors.length > 0 && observer != null) {
      clearInterval(intID);
      intID = -1;
      notReadyCount = 0;
      setupCart();
      if (options[USE_POST]) {
        setupAxiePost();
      }
      debugLog("run ready");
      //console.log("Run time set.");
      lastRun = Date.now();
      lastUrlSeen = window.location.href + "";
    } else {
      notReadyCount++;
      clearMorphDiv();
      debugLog("not ready");
      if (notReadyCount > MAX_RUN_RETRIES) {
        clearInterval(intID);
        console.log("Page took too long to load. Going anyway...");
        clearInterval(intID);
        intID = -1;
        notReadyCount = 0;
      }
      return;
    }

    debugLog(window.location.href);
    if (initObserver) {
      let targetNode = document.body;

      observer.observe(targetNode, observerConfig);
      initObserver = false;
    }

    if (true) {
      //single axie (axieDetail page). Added mouseover handler to Stats text
      if (
        currentURL.match(/https:\/\/marketplace\.axieinfinity\.com\/axie\/\d+/)
      ) {
        //console.log("Run time set.");
        lastRun = Date.now();
        lastUrlSeen = window.location.href + "";
        let axieId = parseInt(getAxieIdFromHref(currentURL));
        let axie;

        if (axieId != "") axie = await getAxieInfoMarket(axieId);
        else {
          axie = null;
        }

        if (axie && axie.id) {
          if (checkIsBugged(axie.id) == false) {
            if (
              !axie.refresh_time ||
              (Date.now() - axie.refresh_time) / 1000 > 60 * 5
            ) {
              console.log(
                "Axie cache data is more than 5 minutes old.  Invalidating..."
              );
              invalidateAxieInfoMarketCB(axie.id, () => {
                clearUpdateDiv();
              });
            }
          }
        }

        if (axie.stage > 2) {
          let xpath = "(//svg:svg[@viewBox='681 3039 12 11'])[2]";
          let pathNode;
          let detailsNode;
          //this will break when localization is implemented on the site
          xpath = "//div[text()='Stats']";
          pathNode = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue;
          //console.log(pathNode);
          detailsNode = pathNode;

          if (!detailsNode) {
            console.log("No stats... trying again in a while.");
            setTimeout(run, 1000);
            return;
          }

          let traits = genGenesDiv(axie, detailsNode, "details", true);

          if (
            detailsNode.childElementCount == 0 &&
            currentURL.startsWith("https://marketplace.axieinfinity.com/axie/")
          ) {
            detailsNode.appendChild(traits);
          } else if (
            !currentURL.startsWith("https://marketplace.axieinfinity.com/axie/")
          ) {
            detailsNode.appendChild(traits);
          }

          setTimeout(() => {
            let canvasNodes = document.getElementsByTagName("canvas");
            if (
              canvasNodes &&
              canvasNodes.length > 0 &&
              canvasNodes.length < 2
            ) {
              let canvasNode = canvasNodes[0];
              let hostNode = canvasNode.parentElement;
              if (hostNode) {
                hostNode = hostNode.parentElement;
                if (hostNode) {
                  hostNode = hostNode.parentElement;
                  if (hostNode && !(hostNode.style + "").match("transform")) {
                    if (document.getElementById("PageGeneDetails") == null) {
                      let traits2 = genGenesDiv(axie, null, "details", true);
                      traits2.id = "PageGeneDetails";
                      traits2.style["font-weight"] = "bold";

                      hostNode.appendChild(traits2);
                      //console.log(traits2.firstChild.firstChild)
                      let dataDiv = document.createElement("td");
                      let purity = Math.round(axie.quality * 100);
                      let secondary = Math.round(axie.secondary * 100);
                      dataDiv.textContent =
                        "P: " + purity + "% S: " + secondary + "%";
                      dataDiv.style.paddingRight = "10px";
                      traits2.firstChild.firstChild.appendChild(dataDiv);

                      let marketLink = buildSearchLink(axie);
                      traits2.firstChild.children[1].appendChild(marketLink);
                    }
                  }
                }
              }
            }
          }, 300);
        }
      }
    }

    //Poll getAxieBriefList if we are on a profile listing page or market listing page, but not axieDetails or ListView
    let bulkPromises = [];
    if (
      currentURL.match(
        /https:\/\/marketplace\.axieinfinity\.com\/(profile|axie)/
      ) &&
      !currentURL.match(/\/axie\/\d+\/?/) &&
      currentURL.lastIndexOf("view=ListView") == -1
    ) {
      let pageAxies = [];
      for (let i = 0; i < axieAnchors.length; i++) {
        let anc = axieAnchors[i];
        let div = anc.firstElementChild;
        let axieId = getAxieIdFromHref(anc.href);
        if (!(axieId in axies)) {
          //get all axies on the page and break
          debugLog("getting axies", axieId);
          if (!Number.isNaN(axieId)) {
            pageAxies.push(axieId);
            if (pageAxies.length > 5) {
              bulkPromises.push(getAxieInfoMarketBulk(pageAxies));
              pageAxies = [];
            }
            //getAxieInfoMarketCB(axieId);
            debugLog(axies);
            //break;
          } else {
            debugLog("axieId is NaN", axieId);
          }
        }
      }
      if (pageAxies.length > 0) {
        bulkPromises.push(getAxieInfoMarketBulk(pageAxies));
      }
    }

    //limit to listing pages and details page, but not in ListView
    if (
      (currentURL.startsWith("https://marketplace.axieinfinity.com/profile/") ||
        currentURL.startsWith("https://marketplace.axieinfinity.com/axie")) &&
      currentURL.lastIndexOf("view=ListView") == -1
    ) {
      //console.log("Waiting on: ", bulkPromises);
      Promise.all(bulkPromises).then(() => {
        for (let i = 0; i < axieAnchors.length; i++) {
          let anc = axieAnchors[i];
          let axieId = parseInt(getAxieIdFromHref(anc.href));

          getAxieInfoMarketCB(
            axieId,
            ((anchor) => {
              return function (axie) {
                renderCard(anchor, axie);
              };
            })(anc),
            ((anchor) => {
              return function (axie, matron, sire) {
                //console.log(matron, sire);
                if (!(options.axieEx_minimal && isProfilePage())) {
                  if (options.axieEx_eggParents) {
                    renderEggCard(anchor, matron, sire);
                  }
                }
              };
            })(anc)
          );
        }
      });
    }
  } catch (e) {
    console.log("ERROR: " + e);
    console.log(e.stack);
    console.log(dbg);
    throw e;
  } finally {
    rescanning = false;
  }
}

var intID;
var options = {};
let goInterval = null;
let lastUrlSeen = window.location.href + "";

//currently, the extension will keep running if the page was previously loaded while enabled...need to reload page to disable inflight extension.
getOptions((response) => {
  options[ENABLE_OPTION] = response[ENABLE_OPTION];
  options[SHOW_BREEDS_STATS_OPTION] = response[SHOW_BREEDS_STATS_OPTION];
  options[MINIMAL_OPTION] = response[MINIMAL_OPTION];
  options[SHOW_EGG_PARENTS] = response[SHOW_EGG_PARENTS];
  options[SHOW_AUCTION] = response[SHOW_AUCTION];
  options[FIRE_THRESHOLD] = response[FIRE_THRESHOLD] - 0;
  options[USE_POST] = response[USE_POST];
  options[POST_ADDRESS] = response[POST_ADDRESS];
  if (options[ENABLE_OPTION]) {
    init();
    intID = setInterval(run, 1000);
  }

  goInterval = setInterval(() => {
    let urlSeen = window.location.href + "";
    if (lastUrlSeen != urlSeen && Date.now() - lastRun > 1000) {
      //console.log( "starting run...", urlSeen, lastUrlSeen, Date.now() - lastRun);
      initObserver = true;
      run();
    } else {
      //console.log( "skipping run...", urlSeen, lastUrlSeen, Date.now() - lastRun);
    }
  }, 1000);
});
