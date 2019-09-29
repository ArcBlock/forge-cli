MUSTACHE=mustache
TPL_FILES = $(shell find . -name "*.tpl")
TARGET_FILES=$(TPL_FILES:%.tpl=%)

TPL_DATA = '{"name": "$(NAME)", "action": "${ACTION}", "description": "${DESCRIPTION}", "requireRelease": "${REQUIRE_RELEASE}", "requireRpcClient": "${REQUIRE_RPC_CLIENT}", "requireWallet": "${REQUIRE_WALLET}", "requireRunningNode": "${REQUIRE_RUNNING_NODE}", "requireChainName": "${REQUIRE_CHAINNAME}", "requireChainExists": "${REQUIRE_CHAIN_EXISTS}", "requireCurrentChainRunning": "${REQUIRE_CURRENT_CHAIN_RUNNING}"}'

mustache: $(TARGET_FILES) rename

$(TARGET_FILES):%:%.tpl
	@echo "Creating target $@ with file $<."
	echo $(TPL_DATA) | $(MUSTACHE) - $< > $@
	@rm $<

rename:
	@mv cli.js $(NAME).js
