$(function() {

    let app = new Vue({
        el: "#simulation",

        data: {
            world: new World(),
            popup: {
                title: "Unknown",
                elevation: 0,
                x: 0,
                y: 0,
                temp: 0,
                hm: 0,
                precip: 0,
                vegetation: 0,
                resources: [],
            },
            built: false,
            scoring: false,
            scored: false,
            progress: 0,
            view: {
                biomes: true,
                height: false,
                precip: false,
                resources: true,
                scoring: false,
                rivers: true,
            },
        },

        mounted: function() {
            let app = this;
            paper.setup(document.getElementById('main-stage'));
            paper.install(window);

            this.world.app = this;
            let layer1 = new paper.Layer();
            let layer2 = new paper.Layer();
            paper.project.layers[0].activate();

            $('body').on('click', function (ev) {
                if (ev.target.id !== 'main-stage') {
                    $('#tooltip-template').hide();
                    app.world.view.resetSelected();
                }
            });
        },

        methods: {
            initWorld: function(ev) {
                paper.project.layers[0].removeChildren();
                paper.project.layers[1].removeChildren();
                this.world.init();
                this.world.makeHeightMap();
                this.world.calculateHeightBiomes();
                this.view.biomes = true;
                this.built = true;
                this.scoring = false;
                this.progress = 0;
                this.updateView();
            },

            tierOneChange: function(ev) {
                this.scoring = false;
                this.scored = false;
                this.built = false;
                this.progress = 0;
                this.view.scoring = false;
            },

            updateContent: function(ev) {
                this.world.calculateHeightBiomes();
                this.clearAllViews();
                this.view.biomes = true;
                this.view.resources = true;
                this.updateView();
            },

            clearAllViews: function(ev) {
                for (let view in this.view) {
                    this.view[view] = false;
                }
            },

            updateView: function() {
                let hasSelection = false;
                for (let view in this.view) {
                    hasSelection = this.view[view];
                    if (hasSelection) break;
                }
                if (!hasSelection) {
                    this.view.biomes = true;
                }

                if (!(this.view.scoring || this.view.precip)) {
                    paper.project.layers[1].visible = false;
                }

                if (this.view.biomes) {
                    this.world.view.showRenderedMap();
                }

                if (this.view.height) {
                    this.world.view.showHeightMap();
                }

                if (this.view.precip) {
                    this.world.view.showPrecipitation();
                }

                if (this.view.scoring) {
                    this.world.view.showScoringMap();
                }
            },

            analyseMap: function() {
                this.world.scoreCells(0, 0);
                this.scoring = true;
            },

            showBiomes: function (ev) {
                this.clearAllViews();
                this.view.resources = true;
                this.view.biomes = true;
                this.updateView();
            },
            showHeight: function (ev) {
                this.clearAllViews();
                this.view.height = true;
                this.updateView();
            },
            showPrecip: function (ev) {
                this.clearAllViews();
                this.view.biomes = true;
                this.view.resources = true;
                this.view.precip = true;
                this.updateView();
            },
            showScoring: function (ev) {
                this.view.height = false;
                this.view.precip = false;
                this.view.scoring = !this.view.scoring;
                if (this.view.scoring) {
                    this.view.biomes = true;
                }
                this.updateView();
            },
            showResources: function (ev) {
                this.view.resources = !this.view.resources;
                if (this.view.resources) {
                    this.view.biomes = true;
                }
                this.updateView();
            }
        },
    });

    window.app = app;
});