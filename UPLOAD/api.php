<?php
declare(strict_types=1);
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$cfgFile=__DIR__.'/config.php';
if(!is_file($cfgFile)){http_response_code(503);echo json_encode(['error'=>'Please copy config.example.php to config.php and configure MySQL.']);exit;}
$cfg=require $cfgFile; date_default_timezone_set($cfg['timezone']??'UTC');
try{$db=new PDO("mysql:host={$cfg['db_host']};dbname={$cfg['db_name']};charset=utf8mb4",$cfg['db_user'],$cfg['db_pass'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);}
catch(Throwable $e){http_response_code(503);echo json_encode(['error'=>'Database connection failed']);exit;}
$action=$_GET['action']??''; $body=json_decode(file_get_contents('php://input'),true)?:[];
function out($v,int $s=200){http_response_code($s);echo json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function setting(PDO $db,string $k,$fallback=[]){$q=$db->prepare('SELECT setting_value FROM settings WHERE setting_key=?');$q->execute([$k]);$v=$q->fetchColumn();return $v===false?$fallback:(json_decode($v,true)??$fallback);}
function saveSetting(PDO $db,string $k,$v){$q=$db->prepare('INSERT INTO settings(setting_key,setting_value) VALUES(?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)');$q->execute([$k,json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)]);}
function admin(){if(empty($_SESSION['spin_admin']))out(['error'=>'Unauthorized'],401);}
function token(string $prefix='SPIN'):string{return $prefix.'-'.strtoupper(substr(bin2hex(random_bytes(8)),0,12));}
function prizeText(array $p):string{$label=trim((string)($p['label']??''));$amount=(float)($p['amount']??0);return trim($label.($amount>0?' $'.($amount==(int)$amount?(int)$amount:$amount):''))?:'PRIZE';}
function validPrizes(array $ps):bool{$sum=0;if(count($ps)<2)return false;foreach($ps as $p){$w=(float)($p['weight']??-1);if($w<0)return false;$sum+=$w;}return abs($sum-100)<0.001;}
function choose(array $ps):array{$n=(mt_rand()/mt_getrandmax())*100;foreach($ps as $p){$n-=(float)$p['weight'];if($n<0)return $p;}return $ps[0];}

if($action==='bootstrap'){
  $games=setting($db,'freeplay_games',[]);$offers=setting($db,'offers',[]);
  $recent=$db->query("SELECT winner_name name,prize,frequency FROM live_items WHERE active=1 ORDER BY id DESC LIMIT 30")->fetchAll();$live=[];foreach($recent as $r)for($i=0;$i<max(1,(int)$r['frequency']);$i++)$live[]=['name'=>$r['name'],'prize'=>$r['prize']];
  $top=$db->query("SELECT winner_name name,prize,top_rank rank FROM live_items WHERE active=1 AND top_rank BETWEEN 1 AND 3 ORDER BY top_rank")->fetchAll();
  out(['games'=>$games,'offers'=>$offers,'recent'=>$live,'top'=>$top]);
}
if($action==='access'){
  $value=trim((string)($body['value']??''));if($value==='')out(['error'=>'Enter Facebook name or deposit code'],422);
  $q=$db->prepare('SELECT * FROM deposit_codes WHERE LOWER(token)=LOWER(?)');$q->execute([$value]);$row=$q->fetch();
  if($row){if($row['status']==='pending'&&strtotime($row['expires_at'])<=time()){$db->prepare("UPDATE deposit_codes SET status='expired' WHERE id=?")->execute([$row['id']]);$row['status']='expired';}out(['mode'=>'deposit','deposit'=>array_merge($row,['prizes'=>json_decode($row['prizes'],true)])]);}
  if(preg_match('/^.+-[A-Z0-9]{8,}$/i',$value))out(['error'=>'This deposit code does not exist or has expired'],404);
  $q=$db->prepare('INSERT INTO players(facebook_name) VALUES(?) ON DUPLICATE KEY UPDATE facebook_name=VALUES(facebook_name)');$q->execute([$value]);
  out(['mode'=>'freeplay','name'=>$value]);
}
if($action==='free_status'){
  $name=trim((string)($body['name']??''));$game=(string)($body['game']??'');$games=setting($db,'freeplay_games',[]);if(!isset($games[$game]))out(['error'=>'Invalid game'],422);
  $q=$db->prepare('SELECT id FROM players WHERE facebook_name=?');$q->execute([$name]);$id=$q->fetchColumn();if(!$id)out(['error'=>'Player not found'],404);
  $q=$db->prepare('SELECT COUNT(*) FROM freeplay_spins WHERE player_id=? AND spin_date=CURDATE()');$q->execute([$id]);$used=(int)$q->fetchColumn();out(['name'=>$name,'game'=>$game,'used'=>$used,'remaining'=>max(0,2-$used),'config'=>$games[$game]]);
}
if($action==='free_spin'){
  $name=trim((string)($body['name']??''));$game=(string)($body['game']??'');$games=setting($db,'freeplay_games',[]);if(!isset($games[$game])||!validPrizes($games[$game]['prizes']))out(['error'=>'Prize rates must total 100%'],422);
  $db->beginTransaction();$q=$db->prepare('SELECT id FROM players WHERE facebook_name=? FOR UPDATE');$q->execute([$name]);$id=$q->fetchColumn();$q=$db->prepare('SELECT COUNT(*) FROM freeplay_spins WHERE player_id=? AND spin_date=CURDATE()');$q->execute([$id]);$used=(int)$q->fetchColumn();if($used>=2){$db->rollBack();out(['error'=>'No spins left today'],409);}
  $p=choose($games[$game]['prizes']);$result=prizeText($p);$code=token();$db->prepare('INSERT INTO freeplay_spins(player_id,game_id,prize,claim_code,spin_date) VALUES(?,?,?,?,CURDATE())')->execute([$id,$game,$result,$code]);$db->prepare("INSERT INTO live_items(source,winner_name,prize,frequency) VALUES('real',?,?,1)")->execute([$name,$result.' · '.$games[$game]['name']]);$db->commit();out(['result'=>$result,'code'=>$code,'used'=>$used+1,'remaining'=>1-$used,'config'=>$games[$game]]);
}
if($action==='deposit_spin'){
  $code=trim((string)($body['token']??''));$db->beginTransaction();$q=$db->prepare('SELECT * FROM deposit_codes WHERE LOWER(token)=LOWER(?) FOR UPDATE');$q->execute([$code]);$r=$q->fetch();if(!$r){$db->rollBack();out(['error'=>'Code not found'],404);}if($r['status']!=='pending'||strtotime($r['expires_at'])<=time()){$db->rollBack();out(['error'=>'Code already used or expired'],409);}$ps=json_decode($r['prizes'],true);if(!validPrizes($ps)){$db->rollBack();out(['error'=>'Prize rates must total 100%'],422);}$p=choose($ps);$result=prizeText($p);$claim=token();$db->prepare("UPDATE deposit_codes SET status='spun',result=?,claim_code=?,spun_at=NOW() WHERE id=?")->execute([$result,$claim,$r['id']]);$db->prepare("INSERT INTO live_items(source,winner_name,prize,frequency) VALUES('real',?,?,3)")->execute([$r['customer_name'],$result.' · DEPOSIT']);$db->commit();out(['result'=>$result,'code'=>$claim,'status'=>'spun','prizes'=>$ps]);
}
if($action==='admin_login'){
  if(hash_equals((string)$cfg['admin_user'],(string)($body['user']??''))&&hash_equals((string)$cfg['admin_pass'],(string)($body['pass']??''))){$_SESSION['spin_admin']=true;out(['ok'=>true]);}out(['error'=>'Invalid login'],401);
}
if($action==='admin_logout'){session_destroy();out(['ok'=>true]);}
if(str_starts_with($action,'admin_'))admin();
if($action==='admin_data'){
  out(['games'=>setting($db,'freeplay_games',[]),'depositWheels'=>setting($db,'deposit_wheels',[]),'offers'=>setting($db,'offers',[]),'players'=>$db->query("SELECT p.*,COUNT(s.id) spins_today FROM players p LEFT JOIN freeplay_spins s ON s.player_id=p.id AND s.spin_date=CURDATE() GROUP BY p.id ORDER BY p.id DESC")->fetchAll(),'freeHistory'=>$db->query("SELECT s.id,p.facebook_name name,s.game_id,s.prize,s.claim_code,s.created_at FROM freeplay_spins s JOIN players p ON p.id=s.player_id ORDER BY s.id DESC LIMIT 500")->fetchAll(),'depositHistory'=>$db->query("SELECT * FROM deposit_codes ORDER BY id DESC LIMIT 500")->fetchAll(),'live'=>$db->query("SELECT * FROM live_items ORDER BY id DESC LIMIT 500")->fetchAll()]);
}
if($action==='admin_save'){
  $key=(string)($body['key']??'');if(!in_array($key,['freeplay_games','deposit_wheels','offers'],true))out(['error'=>'Invalid setting'],422);if($key!=='offers')foreach(($body['value']??[]) as $wheel)if(!validPrizes($wheel['prizes']??[]))out(['error'=>'Every wheel must total exactly 100%'],422);saveSetting($db,$key,$body['value']??[]);out(['ok'=>true]);
}
if($action==='admin_create_code'){
  $name=trim((string)($body['name']??''));$wheel=(string)($body['wheel']??'deposit');$wheels=setting($db,'deposit_wheels',[]);if(!$name||!isset($wheels[$wheel]))out(['error'=>'Missing customer or wheel'],422);$code=preg_replace('/[^A-Za-z0-9_-]/','',$name).'-'.strtoupper(substr(bin2hex(random_bytes(8)),0,12));$hours=max(1,min(720,(int)($body['hours']??24)));$expires=date('Y-m-d H:i:s',time()+$hours*3600);$db->prepare("INSERT INTO deposit_codes(customer_name,token,wheel_id,prizes,expires_at) VALUES(?,?,?,?,?)")->execute([$name,$code,$wheel,json_encode($wheels[$wheel]['prizes']),$expires]);out(['ok'=>true,'token'=>$code]);
}
if($action==='admin_live_add'){$db->prepare("INSERT INTO live_items(source,winner_name,prize,frequency,top_rank) VALUES('manual',?,?,?,?)")->execute([trim((string)$body['name']),trim((string)$body['prize']),max(1,min(10,(int)($body['frequency']??1))),($body['rank']??'')===''?null:(int)$body['rank']]);out(['ok'=>true]);}
if($action==='admin_update'){
  $kind=(string)($body['action']??'');$id=(int)($body['id']??0);
  if($kind==='top'){$rank=$body['rank']??null;$rank=($rank===null||$rank==='')?null:max(1,min(3,(int)$rank));$db->prepare('UPDATE live_items SET top_rank=? WHERE id=?')->execute([$rank,$id]);out(['ok'=>true]);}
  if(in_array($kind,['award','cancel'],true)){$status=$kind==='award'?'awarded':'cancelled';$db->prepare('UPDATE deposit_codes SET status=? WHERE id=?')->execute([$status,$id]);out(['ok'=>true]);}
  if($kind==='save-defaults'){
    $wheels=setting($db,'deposit_wheels',[]);$first=array_key_first($wheels);if($first===null)out(['error'=>'No deposit wheel'],422);
    $weights=$body['weights']??[];$prizes=$wheels[$first]['prizes']??[];foreach($prizes as $i=>&$p)if(isset($weights[$i]))$p['weight']=(float)$weights[$i];unset($p);
    if(!validPrizes($prizes))out(['error'=>'Total rate must be exactly 100%'],422);$wheels[$first]['prizes']=$prizes;saveSetting($db,'deposit_wheels',$wheels);out(['ok'=>true]);
  }
  out(['error'=>'Invalid update'],422);
}
if($action==='admin_player_add'){$name=trim((string)($body['name']??''));if(!$name)out(['error'=>'Vui lòng nhập tên Facebook'],422);$db->prepare('INSERT INTO players(facebook_name) VALUES(?) ON DUPLICATE KEY UPDATE facebook_name=VALUES(facebook_name)')->execute([$name]);out(['ok'=>true]);}
if($action==='admin_delete'){
  $type=(string)($body['type']??'');$id=(int)($body['id']??0);$map=['player'=>['players','id'],'free'=>['freeplay_spins','id'],'deposit'=>['deposit_codes','id'],'live'=>['live_items','id']];if(!isset($map[$type]))out(['error'=>'Invalid type'],422);[$table,$col]=$map[$type];$db->prepare("DELETE FROM $table WHERE $col=?")->execute([$id]);out(['ok'=>true]);
}
if($action==='admin_delete_all'){$type=(string)($body['type']??'');$map=['players'=>'players','free'=>'freeplay_spins','deposit'=>'deposit_codes','live'=>'live_items'];if(!isset($map[$type]))out(['error'=>'Invalid type'],422);$db->exec('DELETE FROM '.$map[$type]);out(['ok'=>true]);}
if($action==='admin_reset_free'){$db->exec('DELETE FROM freeplay_spins WHERE spin_date=CURDATE()');out(['ok'=>true]);}
out(['error'=>'Unknown action'],404);
