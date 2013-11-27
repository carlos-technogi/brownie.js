/* 
 * brownie.js 0.1.0
 * (c) 2013 Carlos Hernandez, Technogi
 * https://github.com/moguelator/brownie.js
 * brownie.js may be freely distributed under the MIT license.
 */

var brownie = {};

brownie.init = function(config_url) {
  if (typeof config_url === 'undefined') {
    throw new Error("No configuration defined");
  }
  $.getJSON(config_url).done(function(config) {
    brownie.config = config.api_properties;
    brownie.log.configure(function() {
      brownie.log.debug("loading messages");
      brownie._internal.loadMessages(function() {
        brownie.log.debug("loading styles ");
        _.forEach(brownie.config.styles, function(style) {
          brownie.log.debug("loading style " + style);
          $("head").append('<link rel="stylesheet" href="styles/' + style + '.css">');
        });
        brownie.log.debug('Loading Layout');
        brownie.views.load('', 'layout', '#app', function() {
          brownie.views.doneLoading();
          brownie.log.debug("Done!");
        });
      });
    });
  }).fail(function(error) {
    throw new Error("Configuration could not be loaded" + JSON.stringify(error));
  });

};

brownie.views = {
  loadSelect: function(params) {
    brownie.log.debug("Loading: " + brownie.config.api.path + params.resource);

    $.getJSON(brownie.config.api.path + params.resource).done(function(data) {

      if (data.length === 0) {
        brownie.log.debug("No content found");
        brownie._internal.exec(params.onEmpty);
      } else {

        brownie.log.debug("Checking params: " + JSON.stringify(params));
        if (typeof params.select_value === 'undefined') {
          brownie.log.debug("setting default select value");
          params.select_value = 'id';
        }
        if (typeof params.select_content === 'undefined') {
          params.select_content = 'name';
        }
        brownie.log.debug("Writing select on: " + params.container);
        $(params.container).html("");
        if (typeof params.first_item !== 'undefined') {
          $(params.container).append("<option value='-1'>" + params.first_item + "</option>");
        }
        $.each(data, function(index, item) {
          $(params.container).append(
                  "<option value='" + brownie._internal.objectByString(item, params.select_value) + "'>"
                  + brownie._internal.objectByString(item, params.select_content) + "</option>");
        });
        brownie._internal.exec(params.done);
      }
    }).fail(params.error);
  },
  autoLoad: function(view, parts, callback) {
    brownie.log.debug("Autoloading view: " + view);
    brownie.log.debug("With parts: " + JSON.stringify(parts));

    if (!_.isArray(parts)) {
      brownie.log.debug("parts is not an array");
      parts = [parts];
      brownie.log.debug("New parts: " + JSON.stringify(parts));
    }

    var finished = 0;
    _.forEach(parts, function(part) {
      brownie.views.load(view, part, "#" + part, function() {
        finished++;
        if (finished === parts.length) {
          brownie._internal.exec(callback);
        }
      });
    });
  },
  load: function(view, part, container, callback) {
    if (typeof container === 'undefined') {
      container = "#" + view;
    }

    brownie.log.debug("Loading: " + view + "/" + part + " into container " + container);
    brownie.log.debug("views/" + view + "/" + part + ".html");
    $.get("views/" + view + "/" + part + ".html").done(function(view_content) {
      brownie.log.trace('Got ' + view_content);
      var compiled = _.template(view_content);

      $(container).html(compiled(brownie._internal.createRenderParams(view)));
      brownie._internal.exec(callback);
    }).fail(function(error) {
      if (error.status === 404) {
        $("#" + part).hide();
      } else {
        console.error(JSON.stringify(error));
      }
    });
  },
  loading: function() {
    document.getElementById("loading_div").style.display = 'block';
  }, doneLoading: function() {
    document.getElementById("loading_div").style.display = 'none';
  }
};

brownie.log = {
  info: function(msg) {
    if (brownie.config.log.level_number >= 3) {
      console.info("INFO: " + msg);
    }
  },
  severe: function(msg) {
    if (brownie.config.log.level_number >= 5) {
      console.error("SEVERE: " + msg);
    }
  },
  debug: function(msg) {
    if (brownie.config.log.level_number >= 1) {
      console.log("DEBUG: " + msg);
    }
  }, trace: function(msg) {
    if (brownie.config.log.level_number >= 0) {
      console.log("TRACE: " + msg);
    }
  },
  configure: function(callback) {
    if (!_.isUndefined(brownie.config.log)) {
      brownie.config.log = {};
    }

    if (!_.isUndefined(brownie.config.log.level)) {
      brownie.config.log.level = 'info';
    }
    if (brownie.config.log.level === 'all') {
      brownie.config.log.level_number = -1;
    } else if (brownie.config.log.level === 'debug') {
      brownie.config.log.level_number = 1;
    } else if (brownie.config.log.level === 'info') {
      brownie.config.log.level_number = 3;
    } else if (brownie.config.log.level === 'severe') {
      brownie.config.log.level_number = 5;
    } else {
      brownie.config.log.level_number = 100;
    }
    brownie._internal.exec(callback);
  }
};

brownie._internal = {
  loadMessages: function(callback) {
    $.getJSON("messages/" + brownie.config.messages + ".json").done(function(data) {
      brownie.messages = data;
      brownie._internal.exec(callback);
    }).fail(function(error) {
      console.error(JSON.stringify(error));
    });
  }, exec: function(callback) {
    if (_.isFunction(callback)) {
      callback();
    }
  }, createRenderParams: function(view) {
    return {
      msg: function(msg) {
        brownie.log.debug("Getting message: " + msg + " from view " + view);
        if (typeof view !== 'undefined' && view !== '') {
          var out = brownie._internal.objectByString(brownie.messages.views, view + "." + msg);
          brownie.log.debug("Got message: '" + out + "'")
          brownie.log.trace("type undefined: " + (typeof out === 'undefined'));
          brownie.log.trace("value undefined: " + (out === 'undefined'));
          if (typeof out !== 'undefined' && out !== 'undefined') {
            return out;
          }

        }
        brownie.log.debug("Getting message without view");
        return brownie._internal.objectByString(brownie.messages, msg);

      }, img: function(img, alt, classes) {
        var out = "<img src='assets/"
                + brownie.config.assets + "/images/" + img + "'";
        out += (typeof alt === 'undefined') ? '' : " alt='" + alt + "' ";
        out += (typeof classes === 'undefined') ? '' : " class='" + classes + "' ";
        out += ">";
        return out;
      }, render: function(page) {
        var result;
        $.ajax({
          url: "views/" + page + ".html",
          async: false,
          success: function(data) {
            result = _.template(data)(brownie._internal.createRenderParams(view));
          }
        });

        return result;
      }, partial: function(partial, data) {
        brownie.log.debug("Rendering " + partial + " for view " + view);

        if (typeof assessment.partials === 'undefined') {
          assessment.partial = {};
        }
        if (typeof assessment.partial[view] === 'undefined') {
          assessment.partial[view] = {};
        }

        if (typeof assessment.partial[view][partial] === 'undefined') {
          $.ajax({
            url: "views/" + view + "/partials/" + partial + ".html",
            async: false,
            success: function(data) {
              assessment.partial[view][partial] = data;
              brownie.log.trace(JSON.stringify(assessment.partial[view][partial]))
            }
          });
        }
        if (typeof data === 'undefined') {
          data = {};
        }
        _.extend(data, brownie._internal.createRenderParams(view));
        brownie.log.trace("Overwritten data: " + JSON.stringify(data));
        return _.template(assessment.partial[view][partial])(data);
      }
    };
  }, objectByString: function(o, s) {
    s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    s = s.replace(/^\./, '');           // strip a leading dot
    var a = s.split('.');
    while (a.length) {
      var n = a.shift();
      if (n in o) {
        o = o[n];
      } else {
        return;
      }
    }
    return o;
  }, handleError: function(error) {
    brownie.log.severe(JSON.stringify(error));
  }
};
