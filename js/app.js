$(function() {

    let app = new Vue({
        el: "#simulation",

        data: {
            world: new World(),
            graphics_init: false,
            popup: {
                title: "Unknown",
                elevation: 0,
                x: 0,
                y: 0,
                temp: 0,
                hm: 0,
            },
            built: false,
        },

        mounted: function() {
            let app = this;
            paper.setup(document.getElementById('main-stage'));
            graphics_init = true;

            this.world.app = this;

            $('body').on('click', function (ev) {
                if (ev.target.id !== 'main-stage') {
                    $('#tooltip-template').fadeOut(250);
                    app.world.view.resetSelected();
                }
            });
        },

        methods: {
            initWorld: function(event) {
                paper.project.activeLayer.removeChildren();
                this.world.init();
                this.world.makeHeightMap();
                this.world.calculateHeightBiomes();
                this.world.view.showRenderedMap();
                //this.world.view.showHeightMap();
                this.built = true;
            },

            tierOneChange: function(event) {
                this.built = false;
            },

            updateContent: function(event) {
                console.log("updating world content");
                console.log(this.world.config.coast_level);
                this.world.calculateHeightBiomes();
                this.world.view.showRenderedMap();
            }
        },
    });

    window.app = app;
});