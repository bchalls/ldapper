var _ = require('lodash');
var util = require('util');
var settings = require('./configs/appconfig');
var Configuration = require('./configuration');
var searchManager = require('./operations/search');
var bindManager = require('./operations/bind');
var connectionManager = require('./connection');

function Ldapper(options) {
  this._config = new Configuration(options, settings);
}

//Expose ldapper public functions
Ldapper.prototype.getConfig = function() {
  return this._config.getOptions();
}

/**
* Search entry into ldap
* @param {string} [filter]
* @param {Array} [attributes]
* @param {string} [searchDn]
* @param {Object} [options]
* @return {Promise<Array>}
* @throws LDAPConnectionError|LDAPBindError|LDAPUnbindError|LDAPSearchError
*/
Ldapper.prototype.find = function(filter, attributes, searchDn, options) {
  var opts = {};
  var appconfig = this._config.getOptions();
  opts['filter'] = (!_.isNull(filter) && !_.isUndefined(filter)) ? filter : appconfig.searchOptions.filter;
  opts['attributes'] = (!_.isNull(attributes) && !_.isUndefined(attributes)) ? attributes : appconfig.searchOptions.attributes;
  opts['scope'] = (!_.isNull(options) && !_.isUndefined(options) && !_.isNull(options.scope) && !_.isUndefined(options.scope)) ? options.scope : appconfig.searchOptions.scope;
  opts['sizeLimit'] = (!_.isNull(options) && !_.isUndefined(options) && !_.isNull(options.sizeLimit) && !_.isUndefined(option.sizeLimit)) ? options.sizeLimit : appconfig.searchOptions.sizeLimit;
  opts['paged'] = (!_.isNull(options) && !_.isUndefined(options) && !_.isNull(options.paged) && !_.isUndefined(option.paged)) ? options.paged : appconfig.searchOptions.paged;
  searchDn = (!_.isNull(searchDn) && !_.isUndefined(searchDn)) ? searchDn : appconfig.searchScope;

  return connectionManager.createClient(appconfig)
  .then(function(client) {
    return searchManager.search(searchDn, opts, client, appconfig, true);
  });
}

/**
* Validate user credentials on ldap
* @param {string} username
* @param {string} password
* @param {Array|string} [authAttributes]
* @param {Array} [retAttributes]
* @param {string} [searchDn]
* @return {Promise<string>}
* @throws LDAPConnectionError|LDAPBindError|LDAPUnbindError|LDAPSearchError
*/
Ldapper.prototype.authenticate = function(username, password, authAttributes, retAttributes, searchDn) {
  var opts = {};
  var appconfig = this._config.getOptions();
  var parts = '';
  if (_.isNull(authAttributes) || _.isUndefined(authAttributes) || (_.isArray(authAttributes) && authAttributes.length <= 0)) {
    authAttributes = ['cn']
  }
  else if (_.isString(authAttributes)) {
    authAttributes = [authAttributes];
  }
  _.each(authAttributes, function(attr) {
    var p = util.format('(%s=%s)', attr, username);
    parts += p;
  });
  var customFilter = util.format('(|%s)', parts);
  opts['filter'] = customFilter;
  opts['attributes'] = (!_.isNull(retAttributes) && !_.isUndefined(retAttributes)) ? retAttributes : 'dn';
  opts['scope'] = 'sub';
  searchDn = (!_.isNull(searchDn) && !_.isUndefined(searchDn)) ? searchDn : appconfig.searchScope;

  return connectionManager.createClient(appconfig)
  .then(function(client) {
    return bindManager.checkAuthentication(password, searchDn, opts, client, appconfig, true);
  });
}

exports = module.exports.Ldapper = Ldapper;
exports = module.exports.create = function(options) {
  return new Ldapper(options);
};