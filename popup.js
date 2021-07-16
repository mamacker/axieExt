
const optionsMapping = {
    enableOption: ENABLE_OPTION, 
    minimalOption: MINIMAL_OPTION, 
    showBreedsStats: SHOW_BREEDS_STATS_OPTION,
    showAuction: SHOW_AUCTION,
    eggParentOption: SHOW_EGG_PARENTS,
    fireThreshold: FIRE_THRESHOLD
};

const optionIsValue = {
  fireThreshold: true
}

$(document).ready(function(){
    let options = Object.keys(optionsMapping);
    console.log("Got options...", optionsMapping);
    getOptions(function(response) {
        let storedOpts = response;
        if (Object.keys(storedOpts).length != options.length) {
            storedOpts = resetOptions();
        }
        for (let opt in optionsMapping) {
            //set UI
            if (storedOpts[optionsMapping[opt]]) {
                $("#" + opt).prop('checked', true);
				if (optionIsValue[opt]) {
                	$("#" + opt).val(storedOpts[optionsMapping[opt]]);
				}
            } else {
                $("#" + opt).prop('checked', false);
            }

            if (!storedOpts[ENABLE_OPTION] && opt != "enableOption") {
                $("#" + opt).prop('disabled', true);
            }

            //handle future changes
            if (opt == "enableOption") {
                $("#" + opt).click(function() {
                    if( $(this).is(':checked') ) {
                        putOption(optionsMapping[opt], true);
                        for (let opt in optionsMapping) {
                            $("#" + opt).prop('disabled', false);
                        }
                    } else {
                        putOption(optionsMapping[opt], false);
                        for (let opt in optionsMapping) {
                            $("#" + opt).prop('disabled', true);
                        }
                    }
                });
            } else {
                $("#" + opt).click(function() {
				  if (!optionIsValue[opt]) {
                    if( $(this).is(':checked') ) {
                        putOption(optionsMapping[opt], true);
                    } else {
                        putOption(optionsMapping[opt], false);
                    }
				  }
                });
                $("#" + opt).change(function() {
				  	if (optionIsValue[opt]) {
                        putOption(optionsMapping[opt], $(this).val());
					}
                });
            }
        }
    });
});
