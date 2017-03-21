# WebGL-clock-widget
## A light weight 3D clock widget made with raw webGL

<img src="https://github.com/Domenicobrz/WebGL-clock-widget/blob/master/screenshots/clockwidget.png" width="300px">

Usage is as simple as creating a ClockWidget from an existing DOMContainer and updating it in your preferred 
animation handler

```javascript

// widget creation
var clockDOM = document.querySelector('#clockWidgetContainer');
window.clock = new ClockWidget(clockDOM);

// widget update 
clock.draw(now);   

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

<img src="https://github.com/Domenicobrz/WebGL-clock-widget/blob/master/screenshots/animated.png" width="300px">


The default mode has no alpha transparency and a default white background, both can be changed by adding the following options