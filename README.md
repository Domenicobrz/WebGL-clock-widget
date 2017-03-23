# WebGL-clock-widget
## A light weight 3D clock widget made with raw webGL

<img src="https://github.com/Domenicobrz/WebGL-clock-widget/blob/master/screenshots/clockwidget.png" width="450px">

Usage is as simple as creating a ClockWidget from an existing DOMContainer and updating it in your preferred 
animation handler

```javascript

// widget creation
var clockDOM = document.querySelector('#clockWidgetContainer');
window.clock = new ClockWidget(clockDOM);

// widget update 
clock.draw();   

```
The above assumes that the clock.json and clocktext.png are both in the 'assets' folder, here's how you specify a different one:

```javascript

window.clock = new ClockWidget(clockDOM, {
    texture: "assets/clocktext.png",
    mesh: "assets/clock7.json"
});  

```

To enable animated mode, which also include alpha transparency, you need to tweak a bit the widget's creation

```javascript

window.clock = new ClockWidget(clockDOM, {
    anim: true,
    animcolors: [
        [150, 0, 0],
        [0, 150, 0],
        [0, 0, 150]
    ],
});  

```

Anim colors refers to three little "spheres" which will be animated inside the clock's display, resulting in the following output:

<img src="https://github.com/Domenicobrz/WebGL-clock-widget/blob/master/screenshots/animated.png" width="450px">


If you prefer to have just the alpha and no animation:


```javascript

window.clock = new ClockWidget(clockDOM, {
    alpha: false, 
    value: 0.55, 
});  

```

At worst, this is what the creation of the widget will look like if you specify custom animation & clock colors

```javascript

window.clock = new ClockWidget(clockDOM, {
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

```