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
            },
            built: false,
            view: {
                biomes: true,
                height: false,
                precip: false,
            },
        },

        mounted: function() {
            let app = this;
            paper.setup(document.getElementById('main-stage'));

            this.world.app = this;

            $('body').on('click', function (ev) {
                if (ev.target.id !== 'main-stage') {
                    $('#tooltip-template').fadeOut(250);
                    app.world.view.resetSelected();
                }
            });
        },

        methods: {
            initWorld: function(ev) {
                paper.project.activeLayer.removeChildren();
                this.world.init();
                this.world.makeHeightMap();
                this.world.calculateHeightBiomes();
                this.view.biomes = true;
                this.built = true;
                this.updateView();
            },

            tierOneChange: function(ev) {
                this.built = false;
            },

            updateContent: function(ev) {
                console.log(this.world.config.coast_level);
                this.world.calculateHeightBiomes();
                this.updateView();
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

                if (this.view.biomes) {
                    this.world.view.showRenderedMap();
                }

                if (this.view.height) {
                    this.world.view.showHeightMap();
                }

                if (this.view.precip) {
                    this.world.view.showPrecipitation();
                }
            },

            showBiomes: function (ev) {
                this.view.biomes = !this.view.biomes;
                this.view.height = false;
                this.updateView();
            },
            showHeight: function (ev) {
                this.view.biomes = false;
                this.view.precip = false;
                this.view.height = !this.view.height;
                this.updateView();
            },
            showPrecip: function (ev) {
                this.view.height = false;
                this.view.precip = !this.view.precip;
                this.updateView();
            },
        },
    });

    window.app = app;
});