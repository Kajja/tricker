Tricker
=======

Tricker is a two player network game where you try trick your opponent to score points.

In a game round, one of the players is the "knower" and the other is the "guesser". There are three small blue rings in the playing field. In every round, one of them is the target, that is, this is where you should stand when the time is out to get points. 

Only the "knower" knows which of the rings is the target, it is marked with a yellow star for the knower. The "guesser" has to figure out which one it is or just take a chance.

In the next round, the roles are reversed. The "knower" is now the "guesser" and vice versa.

The "guesser" has more time than the "knower", so the "knower" must complete its moves a few seconds ahead of the "guesser".


How points are calculated
-------------------------

Knower | Guesser | Points
-------|---------|-------
In target | In target | Knower: 0, Guesser: 1
In target | Wrong ring | Knower: 1, Guesser: -1
In target | On mat | Knower: 1, Guesser: 0
Wrong ring | In target | Knower: -1, Guesser: 1
Wrong ring | Wrong ring (same as Knower) | Knower: 0, Guesser: -1
Wrong ring | Wrong ring (different than Knower) | Knower: -1, Guesser: -1
Wrong ring | On mat | Knower: -1, Guesser: 0
On mat | In target | Knower: 0, Guesser: 1
On mat | Wrong ring | Knower: 0, Guesser: -1
On mat | On mat | Knower: 0, Guesser: 0

So, you can only score points if you are in the target ring, but you can get minus points if you are in another ring. On the mat you don't get any points, neither plus nor minus.


When has someone won?
---------------------
A match is over if:

* one of the players has 2 points

or

* one of the players has -2 points

Install
-------
Tricker is a game that is built for the [multigame](https://github.com/Kajja/multigame) platform, so you need Node.js and the multigame installed. Then do:

```js
npm install tricker --save
```
and in the client code:
```html
<script src="/socket.io/socket.io.js"></script>
<script src="<your directory>/gameProxy.js"></script>
<script src="<your directory>/jquery.min.js"></script>
<script src="<your directory>/tricker_client.js"></script>
```
The first two script are for the multigame platform. The tricker_client.js file can be found under ./lib.

You then need to create a ui with game controls like a start button.

TODO
----
* Remove jQuery dependency