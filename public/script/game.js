$(function () {
    var Game = Backbone.Model.extend({

        setParameters: function (opts) {
            this.playerCount = opts.playerCount;
            this.moneyEach = opts.moneyEach;
            this.moneyIn = this.playerCount * this.moneyEach;
            this.players = new Backbone.Collection();
            for (var i = 0; i < this.playerCount; i++) {
                this.players.add({
                    game: this,
                    name: "Player " + (i + 1)
                });
            }
            this.state = 'params-set';
            this.trigger('game-updated')
        },

        calculateWinnings: function () {
            this.state = 'players-set';
            var totalHolesWon = this.players.reduce(function (memo, player) {
                return memo + player.get('holesWon');
            }, 0);
            var holeValue = this.moneyIn / totalHolesWon;
            this.players.each(function (player) {
                player.set({winnings: (holeValue * player.get('holesWon')).toFixed(2)});
            });
            this.trigger('game-updated');
        }
    });

    var Player = Backbone.Model.extend({
        initialize: function (opts) {
            this.game = opts.game;
        }
    });

    var MainView = Backbone.View.extend({
        el: "#app",

        initialize: function () {
            this.game = new Game();
            this.listenTo(this.game, 'game-updated', this.render);
            this.render();
        },

        render: function () {
            if (this.currentView) {
                this.currentView.close();
                this.$el.empty();
            }
            var newView = this.gameViewState();
            this.currentView = new newView(this.game);
            this.$el.html(this.currentView.render());
        },

        gameViewState: function () {
            if (this.game.state == 'params-set') {
                return PlayerEditView;
            } else if (this.game.state == 'players-set') {
                return PlayerWinningsView;
            } else {
                return NewGameView;
            }
        }
    });

    var NewGameView = Backbone.View.extend({
        template: _.template($('#configure-game-template').html()),

        events: {
            'submit form': 'submit'
        },

        initialize: function (game) {
            this.game = game;
            _.bindAll(this, 'render', 'submit');
        },

        render: function () {
            this.$el.html(this.template({}));
            return this.el;
        },

        submit: function (event) {
            event.preventDefault();
            var playerCount = +$('#player-count').val();
            var moneyEach = +$('#money-each').val();
            this.game.setParameters({
                playerCount: playerCount,
                moneyEach: moneyEach
            });
        },

        close: function () {
            this.$el.remove();
        }
    });

    var PlayerEditView = Backbone.View.extend({
        template: _.template($('#player-edit-template').html()),

        events: {
            'submit form': 'submit'
        },

        initialize: function (game) {
            this.game = game;
            _.bindAll(this, 'render', 'submit');
            this.playerViews = [];
        },

        render: function () {
            this.$el.html(this.template({}));
            var that = this;
            this.game.players.each(function (player) {
                var playerView = new PlayerFormView(player);
                that.$(".players").append(playerView.render());
                that.playerViews.push(playerView);
            });
            return this.el;
        },

        submit: function (event) {
            event.preventDefault();
            Backbone.trigger('players-saved');
            this.game.calculateWinnings();
        },

        close: function () {
            Backbone.trigger('player-edit-complete');
            this.$el.remove();
        }
    });

    var PlayerFormView = Backbone.View.extend({
        template: _.template($('#player-line-item-template').html()),

        initialize: function (player) {
            this.player = player;
            this.listenTo(Backbone, 'players-saved', this.collectData);
            this.listenTo(Backbone, 'player-edit-complete', this.close);
        },

        render: function () {
            this.$el.html(this.template(this.player.toJSON()));
            return this.el;
        },

        collectData: function () {
            this.player.set({holesWon: +this.$('.holes-won').val()});
        },

        close: function () {
            this.$el.remove();
        }
    });

    var PlayerWinningsView = Backbone.View.extend({
        mainTemplate: _.template($('#results-template').html()),
        playerTemplate: _.template($('#player-results-template').html()),

        initialize: function (game) {
            this.game = game;
            _.bindAll(this, 'render');
        },

        render: function () {
            this.$el.html(this.mainTemplate({}));
            var that = this;

            this.game.players.each(function (player) {
                that.renderPlayer(player);
            });
            return this.el;
        },

        renderPlayer: function (player) {
            var resultItem = this.playerTemplate(player.toJSON());
            this.$(".players").append(resultItem);
        }
    });

    new MainView();
});
