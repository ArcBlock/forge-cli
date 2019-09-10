const { isEmptyDirectory } = require('core/forge-fs');

const BaseHandler = require('./base');

const { TEMPLATES_FIELD_NAME } = BaseHandler;

class StarterHandler extends BaseHandler {
  verify() {
    super.verify();

    if (!this.blockletConfig[TEMPLATES_FIELD_NAME]) {
      throw new Error(`There is no '${TEMPLATES_FIELD_NAME}' config in blocklet.json`);
    }

    if (!isEmptyDirectory(process.cwd())) {
      throw new Error('Current directory is not empty');
    }
  }
}

module.exports = StarterHandler;
