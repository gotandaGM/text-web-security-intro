$(function () {
  "use strict";
  var $notFound = $('#not-found-msg');

  var createManPageUrl = function (name) {
     return "http://linux.die.net/man/1/" + name;
  };

  var updateCommandsList = (function ($list) {
    $list.empty();
    var $empty = $list.clone(false);
    return function (commands) {
      var $newList = $empty.clone(false);
      if (commands.length > 0) {
        commands.forEach(function (command) {
          var url = createManPageUrl(command);
          var $link = $('<a>').attr('href', url).text(command);
          var $command = $('<li>').append($link);
          $newList.append($command);
        });
        $notFound.hide();
      }
      else {
        $notFound.text(keyword.get() + "に関連するドキュメントは見つかりませんでした。");
        $notFound.show();
      }
      $list.replaceWith($newList);
      $list = $newList;
    };
  })($('#list'));

  var open = function (name) {
    location.href = createManPageUrl(name);
  };

  var keyword = (function (keyword) {
    return {
      get: function () { return keyword; },
      set: function (newer) {
        keyword = newer;
        this.changed();
      },
      changed: function () {
        commands.changed();
      }
    };
  })("");

  var commands = (function (commands) {
    var FPS = 20;
    var changed = 0;

    var update = function () {
      var rx = new RegExp(keyword.get());
      var filtered = commands.filter(function (cmd) { return cmd.match(rx); });
      updateCommandsList(filtered);
    };

    setInterval(function () {
      if (changed) {
        update(commands);
        changed = 0;
      }
    }, 1000 / FPS);

    return {
      get: function () { return commands; },
      set: function (newer) {
        commands = newer;
        this.changed();
      },
      changed: function () {
        changed++;
      }
    };
  })([]);

  // bind
  $.getJSON('commands.json', commands.set.bind(commands));
  $('input[name="keyword"]').keyup(function () {
    keyword.set($(this).val());
  });
  $('#keyword-search-form').submit(function () {
    open(keyword.get());
  });

  // from search
  (function () {
    var newer = location.search.substring(1)
      .split("&")
      .map(function (pair) { return pair.split('='); })
      .filter(function (pair) { return pair[0] === "keyword"; })[0][1];
    if (newer) {
      newer = decodeURIComponent(newer);
      $('input[name="keyword"]').val(newer);
      keyword.set(newer);
    }
  })();
});
