import importlib.util,random,io,contextlib
from unittest.mock import patch
from pathlib import Path
p=str(Path(__file__).with_name('tunell.py'))
s=importlib.util.spec_from_file_location('tunnel',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
results=[]
def check(name,f):
 try:
  with contextlib.redirect_stdout(io.StringIO()):f()
  results.append('PASS: '+name)
 except Exception as e:results.append('FAIL: '+name+' '+repr(e))
def eq(a,b):assert a==b,(a,b)
check('Same seed produces identical routes',lambda:eq(m.make_level(random.Random('demo'),1),m.make_level(random.Random('demo'),1)))
def shape():
 for lvl in [1,2,3]:
  r=m.make_level(random.Random(0),lvl);eq(set(r),set('ABC'))
  for x in r.values():eq(len(x['obs']),2 if lvl==1 else 3);assert len(x['code'])==5 and x['code'].isdigit()
check('Route counts, obstacle counts and code format',shape)
def ask():
 with patch('builtins.input',side_effect=['','!',' A long answer']):eq(m.ask('', 'ab'),'a')
check('Input validation rejects empty/invalid and accepts first valid character',ask)
def route(obs,fort=None):return {'obs':obs,'code':'12345','fort':fort or {}}
def attack(name,answers,expected,fort=None,zd=1):
 g={'zd':zd}
 with patch('builtins.input',side_effect=answers):eq(m.tackle(random.Random(0),g,route([name],fort),name)[0],expected)
 return g
check('Reinforced panel forces retreat',lambda:attack('panel',[],'retreat',{'panel':2}))
check('Zero-day passes camera and consumes one resource',lambda:eq(attack('camera',['z'],'pass')['zd'],0))
check('Keypad shortcut is a honeypot capture',lambda:attack('keypad',['s'],'caught'))
check('Correct keypad code passes',lambda:attack('keypad',['t','12345'],'pass'))
check('Three incorrect keypad attempts can produce retreat',lambda:attack('keypad',['t','0','0','0'],'retreat'))
check('Facing a lone robot causes capture',lambda:attack('robot',['f'],'caught'))
def accumulation():
 routes={'A':route(['camera'])};rng=random.Random(0)
 for _ in range(3):m.architect(rng,routes,'A',[('A','camera')])
 eq(routes['A']['fort']['camera'],3)
check('Fortification accumulates to route sealing threshold',accumulation)
def seal():
 text=io.StringIO()
 with patch.object(m,'make_level',return_value={'A':route(['panel'],{'panel':3}),'B':route(['gap']),'C':route(['robot'])}),patch('builtins.input',side_effect=['a','q']),contextlib.redirect_stdout(text):eq(m.play_level(random.Random(0),{'zd':1,'codes':set()},1),'quit')
 assert 'Route sealed' in text.getvalue()
check('Sealed route is refused without ending session',seal)
def lose():
 with patch.object(m,'make_level',return_value={x:route(['robot']) for x in 'ABC'}),patch('builtins.input',side_effect=['a','f','b','f','c','f']):eq(m.play_level(random.Random(0),{'zd':1,'codes':set()},1),'lost')
check('Three captures end level with loss',lose)
def final():
 g={'zd':1,'final':'12345'}
 with patch('builtins.input',return_value='z'):eq(m.final_computer(g),True)
 eq(g['zd'],0)
 with patch('builtins.input',side_effect=['t','0','0','0']):eq(m.final_computer({'zd':0,'final':'12345'}),False)
check('Final computer supports zero-day and rejects three wrong codes',final)
def win():
 states=[]
 def level(rng,g,lvl):states.append((lvl,g['zd']));return 'won'
 with patch.object(m,'play_level',side_effect=level):eq(m.run(random.Random(0)),'won')
 eq(states,[(1,1),(2,2),(3,2)])
check('Top-level progression and level-2 resource grant (mocked levels)',win)
def full():
 g={'zd':0,'codes':set()}
 def answer(prompt):
  if 'Route [a]' in prompt:return 'a'
  if '[t]ype the code' in prompt:return 't'
  if '5-digit code' in prompt:return '12345'
  if '[t]ype the final code' in prompt:return 't'
  if 'Final code:' in prompt:return g['final']
  raise AssertionError(prompt)
 with patch.object(m,'make_level',return_value={x:route(['keypad']) for x in 'ABC'}),patch('builtins.input',side_effect=answer):eq(m.play_level(random.Random(0),g,3),'won')
check('Control-network success with controlled route and valid final credential',full)
print('\n'.join(results));print(f'\n{sum(x.startswith("PASS") for x in results)}/{len(results)} checks passed.')
assert all(x.startswith('PASS') for x in results)
