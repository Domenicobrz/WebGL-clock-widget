window.addEventListener("load", init);

function init() {
    var clockDOM = document.querySelector('#clockWidgetContainer');
    window.clock = new ClockWidget(clockDOM, {
            alpha: true, 
            value: 0.55, 
            anim: false,
            animcolors: [
                [150, 0, 0],
                [0, 150, 0],
                [0, 0, 150]
            ],
            clockColors: {
                display:    [100, 100, 100],
                outerEdge:  [123, 23, 0],
                innerEdge:  [123, 23, 0],
                minHandle:  [123, 23, 0],
                secHandle:  [123, 23, 0],
                sec2Handle: [123, 23, 0],
                hourHandle: [123, 23, 0],
                circHandle: [123, 23, 0]
            },
            customTexture: "assets/clocktext.png"
        });

    requestAnimationFrame(animate);
}

function animate(now) {
    requestAnimationFrame(animate);
    clock.draw(now);    
}