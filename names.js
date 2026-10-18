// Kid-safe player names: players can only be "Adjective Animal" from these lists (no typing).
const ADJ = ['Zippy','Speedy','Splashy','Bubbly','Mighty','Super','Turbo','Happy','Jolly','Brave','Swift','Lucky','Sunny','Rocket','Wavy','Bouncy','Cosmic','Fizzy','Snappy','Zoomy'];
const ANI = ['Otter','Shark','Dolphin','Turtle','Seal','Orca','Penguin','Octopus','Walrus','Narwhal','Manatee','Puffin','Squid','Crab','Marlin','Stingray','Seahorse','Pelican','Beaver','Frog'];
function valid(name){ const w=String(name||'').split(' '); return w.length===2 && ADJ.includes(w[0]) && ANI.includes(w[1]); }
function random(){ return ADJ[Math.floor(Math.random()*ADJ.length)]+' '+ANI[Math.floor(Math.random()*ANI.length)]; }
if (typeof module!=='undefined') module.exports = { ADJ, ANI, valid, random };
