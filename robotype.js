/*
 * RoboType.js
 * http://github.com/eddflrs/robotype
 * @author Eddie Flores
 * @license MIT License
 */

/*global $, _ */
/*jshint browser:true, indent:2 */

(function(window, $, _) {

  "use strict";

  var ENTER_KEY = 13, UP_KEY = 38, DOWN_KEY = 40;

  /**
   * @private
   * Binds a function with the given context.
   */
  var bind = function (ctx, fn) {
    var bindedFn = function () {
      return fn.apply(ctx, arguments);
    };
    return bindedFn;
  };

  /**
   * @private
   * Prevents the cursor from moving to the beginning or end of the line
   * when hitting the up/down arrow keys while the input field is focused.
   */
  var preventCursorShift = function (e) {
    if (e.which === UP_KEY || e.which === DOWN_KEY) {
      e.preventDefault();
    }
  };

  /**
   * @private
   * Invokes datasource.fetch() and calls onFetched() to present the results.
   */
  var fetchCompletions = function (e) {
    var query = e.target.value, results = [], pressedKey = e.which;

    if (query) {
      results = this.datasource.fetch(query);
      this.savePending = !results || results.length === 0;
    }

    this.onFetched(results, pressedKey);
  };

  /**
   * @private
   * Saves the input data by calling datasource.save() if no autocompletion
   * data was previously found for the given query.
   */
  var saveInputData = function (e) {
    var value = e.target.value, self = this;
    if (self.savePending && value) {
      self.datasource.save(value);
      self.savePending = true;
    }
  };

  /**
   * @private
   * Scrolls the container to the given target element. Used to scroll the <ul>
   * when the up/down keys are pressed.
   */
  var scrollTo = function ($target) {
    var paneElem = $target.parent(), itemElem = $target;

    paneElem.stop();

    var paneOff = paneElem.offset().top,
      itemOff = itemElem.offset().top,
      paneHeight = paneElem.height(),
      itemHeight = itemElem.outerHeight(),
      indexOfItem = $target.index(),
      distFromPaneTop = itemOff - paneOff,
      needsScrolling = distFromPaneTop < 0 ||
        (distFromPaneTop + itemHeight) > paneHeight;

    if (needsScrolling) {
      paneElem.animate(
        {scrollTop: itemHeight * indexOfItem},
        {duration: 350, easing: 'linear'}
      );
    }
  };

  /**
   * @private
   * Changes the currently selected item.
   */
  var changeSelection = function (targetElem) {
    this.setCurrentElem(targetElem);
    scrollTo(this.$currentElem);
  };

  var completeSelection = function (targetElem) {
    var text = targetElem.text();
    console.log('You selected ' + text);
    $('#'+this.name)[0].value = text;
  };

  /**
   * @public
   * @constructor
   * Creates an instance of the RoboType object.
   */
  var RoboType = function(name, datasource, options) {
    var inputElemSelector = "#" + name, self = this;

    if (!_.isFunction(datasource.fetch) || !_.isFunction(datasource.save)) {
      throw new Error("The datasource must have a fetch and save method.");
    }

    self.config = {
      listTemplate: Template.roboTypeList,
      itemTemplate: Template.roboTypeItem,
      partialSuffix: '-completions',
      partialName: name
    };

    self.config.partialName += self.config.partialSuffix;

    if (_.isObject(options)) {
      _.extend(self.config, options);
    }

    self.name = name;
    self.datasource = datasource;
    self.savePending = false;
    self.results = new Meteor.Collection(null);

    Meteor._def_template(this.config.partialName, function () {
      var result = self.results.findOne();
      return result ? result.items : '';
    });

    Template[this.config.partialName].created = function () {
      console.log('Twas created');
    };

    Template[this.config.partialName].rendered = function () {
      console.log('Twas rendered ');
      self.setCurrentElem($('.selected'));
    };

    Template[this.config.partialName].destroyed = function () {
      console.log('Twas destroyed');
    };

    $(document).on('keydown', inputElemSelector, bind(this, preventCursorShift));
    $(document).on('keyup', inputElemSelector, bind(this, fetchCompletions));
    $(document).on('blur', inputElemSelector, bind(this, saveInputData));
  };

  /**
   * @private
   */
  RoboType.prototype.setCurrentElem = function ($elem) {
    if (!$elem || $elem.length <= 0) return;
    if (this.$currentElem) {
      this.$currentElem.removeClass('selected');
    }
    this.$currentElem = $elem;
    this.$currentElem.addClass('selected');
  };

  /**
   * @public
   * Callback that is passed the results from calling datasource.fetch().
   * Override this method if you would like to handle the displaying of results
   * on your own. By default, results are presented using RoboType's styling.
   */
  RoboType.prototype.onFetched = function(results, pressedKey) {
    var self = this;

    if (!results || results.length === 0) {
      self.results.remove({});
      return;

    } else if (pressedKey === ENTER_KEY && this.$currentElem) {
      completeSelection.call(this, this.$currentElem);

    } else if (pressedKey === DOWN_KEY && this.$currentElem) {
      console.log('down');
      changeSelection.call(this, this.$currentElem.next());

    } else if (pressedKey === UP_KEY && this.$currentElem) {
      console.log('up');
      changeSelection.call(this, this.$currentElem.prev());

    } else {
      var $list = $('<div>'); // temporary container

      _.forEach(results, function(result) {
        var $item = $(self.config.itemTemplate({item: result}));
        $item.appendTo($list);
      });

      var $first = $list.children().first();
      $first.addClass('selected');

      var $final = self.config.listTemplate({id: self.config.partialName, list: $list.html()});

      self.results.remove({});
      self.results.insert({items: _.unescape($final)});
    }
  };

  /* Expose */
  window.RoboType = RoboType;

}(this, $, _));