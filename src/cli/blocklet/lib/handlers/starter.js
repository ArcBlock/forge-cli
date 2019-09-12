const BaseHandler = require('../base-handler');

const { TEMPLATES_FIELD_NAME } = BaseHandler;

class StarterHandler extends BaseHandler {
  verify() {
    super.verify();

    if (!this.blockletConfig[TEMPLATES_FIELD_NAME]) {
      throw new Error(`There is no '${TEMPLATES_FIELD_NAME}' config in blocklet.json`);
    }
  }
}

module.exports = StarterHandler;
