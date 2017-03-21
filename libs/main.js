window.addEventListener("load", init);

function init() {
    var clockDOM = document.querySelector('#clockWidgetContainer');
    window.clock = new ClockWidget(clockDOM, {
            alpha: false, 
            value: 0.55, 
            anim: true,
            animcolors: [
                [150, 0, 0],
                [0, 150, 0],
                [0, 0, 150]
            ],
            clockColors: {
                display:    [150,  132,  125 ],
                outerEdge:  [150,  132,  125 ],
                innerEdge:  [90,  78,  78  ],
                minHandle:  [218,  200, 193 ],
                secHandle:  [150,  132,  125 ],
                sec2Handle: [90,  78,  78 ],
                hourHandle: [255,  38, 38 ],
                circHandle: [48,  48, 48 ],           
            },
            texture: "assets/clocktext.png",
            mesh: "assets/clock7.json",
            background: [255, 255, 255]
        });

    requestAnimationFrame(animate);
}

function animate(now) {
    requestAnimationFrame(animate);
    clock.draw(now);    
}