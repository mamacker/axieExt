const ENABLE_OPTION = "axieEx_enabled";
const MINIMAL_OPTION = "axieEx_minimal";
const SHOW_BREEDS_STATS_OPTION = "axieEx_breedsStats";
const SHOW_EGG_PARENTS = "axieEx_eggParents";
const SHOW_AUCTION = "axieEx_auction";
const FIRE_THRESHOLD = "axieEx_fireThreshold";
const USE_POST = "axieEx_usePost";
const POST_ADDRESS = "axieEx_postAddress";

function putOption(key, value) {
    let persist = {};
    persist[key] = value;
    putOptions(persist);
    console.log("Persisting options...");
}

function putOptions(persist) {
    chrome.storage.sync.set(persist, function() {
    });
}

function getOptions(callback) {
    chrome.storage.sync.get([
        ENABLE_OPTION, 
        MINIMAL_OPTION, 
        SHOW_EGG_PARENTS,
        SHOW_AUCTION,
	  	FIRE_THRESHOLD,
	  	USE_POST,
	    POST_ADDRESS,
        SHOW_BREEDS_STATS_OPTION], callback);
}

function getOption(key, callback) {
    chrome.storage.sync.get([key], callback);
}

function resetOptions() {
    console.log("reset options");
    let defaultOptions = {};
    defaultOptions[ENABLE_OPTION] = true;
    defaultOptions[MINIMAL_OPTION] = false;
    defaultOptions[SHOW_BREEDS_STATS_OPTION] = true;
    defaultOptions[SHOW_EGG_PARENTS] = true;
    defaultOptions[SHOW_AUCTION] = true;
    defaultOptions[FIRE_THRESHOLD] = 97;
    defaultOptions[USE_POST] = false;
    defaultOptions[POST_ADDRESS] = "http://localhost:55555/{axieid}";
    putOptions(defaultOptions);
    return defaultOptions;
}
