/**
 * By James Aichinger 2017
 */

$(function() {

    // this is the definition of a new Vue application, this handles the response to most of the UI input
    // it also stores the state of the application.
    let app = new Vue({
        el: "#simulation",

        data: {
            world: new World(), // create a new world and make it visible to the application
            popup: {  // stores all the values for the popup window, it maps to this data structure
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
            rivers: true,
            progress: 0,
            view: {
                biomes: true,
                height: false,
                precip: false,
                resources: true,
                scoring: false,

            },
        },

        mounted: function() { // called once the Vue application has attached itself to the DOM
            let app = this;
            paper.setup(document.getElementById('main-stage'));
            paper.install(window);

            this.world.app = this;
            let layer1 = new paper.Layer();  // create a layer for the actual map graphics
            let layer2 = new paper.Layer();  // create a layer for the overly graphics.
            paper.project.layers[0].activate(); // make the map layer active

            // Functionality to hide the cell information window when a user clicks off the map
            $('body').on('click', function (ev) {
                if (ev.target.id !== 'main-stage') {
                    $('#tooltip-template').hide();
                    app.world.view.resetSelected();
                }
            });

            // add in save button functionality
            $('#btnsave').on('click', function(ev) {
                let link = $(this).get()[0];
                link.href = $('#main-stage').get()[0].toDataURL('image/png');
                link.download = "world_gen_" +
                    app.world.config.seed + "_" +
                    app.world.config.size + "_" +
                    app.world.config.perlin.scale + "_" +
                    app.world.config.perlin.octaves +
                    ".png";
            });
        },

        methods: {
            initWorld: function(ev) {
                paper.project.layers[0].removeChildren();
                paper.project.layers[1].removeChildren();
                this.world.init();
                this.world.makeHeightMap();
                this.world.calculateBiomes();
                this.view.biomes = true;
                this.built = true;
                this.scoring = false;
                this.progress = 0;
                this.updateView();
            },

            // Detect changes to the world structure and prompt the user to rebuild the map to continue
            tierOneChange: function(ev) {
                this.scoring = false;
                this.scored = false;
                this.built = false;
                this.progress = 0;
                this.view.scoring = false;
            },

            // Changes have been made to the content settings.
            updateContent: function(ev) {
                this.world.calculateBiomes();
                this.clearAllViews();
                this.view.biomes = true;
                this.view.resources = true;
                this.scoring = false;
                this.scored = false;
                this.progress = 0;
                this.view.scoring = false;
                this.updateView();
            },

            // reset the views that have been selected by the user.
            clearAllViews: function(ev) {
                for (let view in this.view) {
                    this.view[view] = false;
                }
            },

            // render the map as per the views the user has selected
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