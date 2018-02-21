module.exports.validateRequiredConfigProps = (configurableInstance) => {
  configurableInstance.constructor.requiredConfigProps.forEach((prop) => {
    if (configurableInstance.config[prop] === undefined) {
      throw new Error(`${ configurableInstance.constructor.name } requires a "${ prop }" setting to be configured.`);
    }
  });
};
