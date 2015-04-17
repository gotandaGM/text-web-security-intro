# メジャーな脆弱性

# XSS

Cross Site Scriptingの略です。頭文字を取ってCSSとしてしまうとCascading Style Sheetsと見分けが付かなくなってしまうので、便宜上XSSと略されます。  
さて、XSSとは何なのかというと、フロントエンドコードへのコードインジェクション全般を指すと思ってもらえると理解がはやいと思います。  
つまり、HTML/Java Script/CSSのいずれかに対して、任意のコードを埋め込み、他のクライアントで実行させる類のものを指します。  
具体的な事例はこの記事に詳しくまとまっています。読みましょう: [色んなXSS](http://nootropic.me/blog/2015/02/16/%E8%89%B2%E3%82%93%E3%81%AAxss/)

簡単な例を示します。

以下のようなコードがあったとします。（なお、仮に$idはリクエストパラメータの値がそのまま渡されるとします）
```html
<form action="/foo/submit">
<input type="hidden" name="id" value="$id" />
...
</form>
```

これは`$id=1`の場合は以下の様な出力になります。

```html
<form action="/foo/submit">
<input type="hidden" name="id" value="1" />
...
</form>
```

もし、仮に

```perl
$id='3" /><script type="text/javascript">alert("XSS")</script><input type="hidden" name="hoge" value="fuga';
```

という具合だったら以下のようになってしまいます。

```html
<form action="/foo/submit">
<input type="hidden" name="id" value="3" /><script type="text/javascript">alert("XSS")</script><input type="hidden" name="hoge" value="fuga" />
...
</form>
```

これでは任意のスクリプトを含むURL(ex. `http://hoge/foo/?id=3%22%20%2F%3E%3Cscript%20type%3D%22text%2Fjavascript%22%3Ealert(1)%3C%2Fscript%3E%3Cinput%20type%3D%22hidden%22%20name%3D%22hoge%22%20value%3D%22fuga`)を踏ませる事で簡単に任意のコードを他人のマシンで実行出来てしまいます。
これができると、例えばフォームの内容を他のWEBサイトにも送信するコードを埋め込む事でアカウントを盗み取る事が出来たりしてしまいます。

対策として最も有効なのは、
コードに埋め込む文字に大して適切なエスケープ処理を行う事です。
これは例えば上記のようなHTMLの場合は、以下の2つの処理を行なっておくと良いでしょう

* HTMLエスケープ
* JavaScriptエスケープ

## サーバーサイド

これらのテンプレートエンジンを使っておけばデフォルトでHTMLエスケープをしてくれるので便利かつ安全です。(スマートエスケープ機能)

- Text::Xslate
- Text::MicroTemplate

## クライアントサイド
underscore.jsの_.templateはちゃんとHTML Escapeを行なってくれる。
あんまり詳しくない。

## DOM Based XSS

DOM操作によって起きるXSSをDOM Based XSSと呼びます。  
たとえば、`location.hash`などから情報を取得し、そのURLに飛ぶというケースを考えましょう。  

```javascript
var path = location.hash.substring(1);
location.href = path;
```

たとえばこのコードは一見オープンリダイレクタしか無いように見えますが、`javascript:alert(1)`といった具合にjavascriptスキームを入れることによりXSSが可能です。  
このようなXSSを防ぐためにはDOM APIを正しく利用する必要があります。

## JavaScriptエスケープ

最近はJavaScriptエスケープも重要になってきている。
例えばHTML中に書かれたScriptタグの中に任意のコードを埋め込まれたらまずいのです。

PerlではJavaScript::Value::Escapeを使うとうまいことやってくれる。
あるいはテンプレート中には一切JSを書かず、data-* attributeやmetaタグなどを活用してHTML中にデータだけ埋め込むのも手である。
もちろん、その場合は必ずHTMLエスケープしたデータを入れるべきである。

JavaScriptコード内でJavaScriptを文字列に埋め込まないといけないけーすはevalするとき以外無いはずなので、
可能な限りevalを使わない事をおすすめします。JSONはJSON.parseつかうべし。(ECMAScript5対応ブラウザではビルドイン/古いブラウザにも対応するならjson2.js)


## 参考文献

* [JavaScriptでリンク先URLがhttp/httpsか確認する方法](http://d.hatena.ne.jp/hasegawayosuke/20141030)
* http://d.hatena.ne.jp/kazuhooku/20131106/1383690938
* http://d.hatena.ne.jp/kazuhooku/20131107/1383837457

# SQLインジェクション

```perl
my $result = $dbh->selectrow_hashref("SELECT * FROM user WHERE id = '$id'");
```

とか書いてはならない。
これでは`$id`に`1'; DROP DATABASE my_app_db; -- `を与えた場合、以下のようなSQLが発行される。

```sql
SELECT * FROM user WHERE id = '1'; DROP DATABASE my_app_db; -- '
```

なので、以下のようにプレースホルダを使いましょう。

```perl
my $result = $dbh->selectrow_hashref('SELECT * FROM user WHERE id = ?', undef, $id);
```

SQLは変数展開する`""`や`qq{}`は使用せず、必ず`''`か`q{}`を使いましょう。

```sql
SELECT * FROM user WHERE id = '1\'; DROP DATABASE my_app_db; -- '
```

ただしテーブル名には?（プレースホルダ）は使えないので、どうしても動的にテーブル名を決めたい場合は何かを通して、汚染されていない事が保証できるstaticな値を使うようにしましょう。

```perl
use Readonly;

Readonly my %table_hash = (
    user => 'user',
    hoge => 'fuga',
);

my $table  = $table_hash{$input} or die;
my $result = $dbh->selectrow_hashref("SELECT * FROM ${table} WHERE id = ?", undef, $id);
```

もちろん本来はテーブル名を動的に決めなければいけないケースならばSQL文自体を分けるべきです。
どうしてもという場合の最終手段として。

# OSコマンドインジェクション

こんな事は絶対にやってはならない。

```perl
my $filenmae = $req->param('filename');
system("touch $filename");
```

これはfilenameに "/dev/null && rm -rf /" みたいなのが渡せて任意のコマンドが打ててしまう。


たとえばperlのsystemなら複数の引数を渡すと二番目以降の引数を勝手にescapeしてくれるのでこうすると良い。

```perl
my $filenmae = $req->param('filename');
system('touch', $filename);
```

また、これと関連して二引数のopen関数も同様の理由で使ってはならない。
これはpipe記法があるためである。

```perl
my $filenmae = $req->param('filename');
open(my $fh, "$filename");
```

ここに`| rm -rf /`みたいなのが渡せて死ぬので必ず三引数のopenを使うべし。

# CSRF

僕はまちちゃん事件でググるべし。
要は別サイトからlocationなどで任意のURIにアクセスさせてあんな事やこんな事をさせようとする攻撃。
例えばネット銀行のお金を振り込むURLへのPOSTリクエストを行うJSのコードを実行させられれば、クライアントがログインしている状態であれば攻撃者の任意の振込先にお金を振り込ませる事が可能。
クライアントが持っているセッション情報をそのまま利用しているので、認証をくぐり抜けてしまうので、認証をどんなに硬くしてようが意味が無い。

対策は、リファラーチェック、もしくは&lt;input type="hidden" name="CSRF" value="OneTimeRandomString" /&gt;みたいなのを埋め込む。
あとはGETリクエストではデータの書き込みは行わせないとか、セッションで前回アクセスしたページを記録して、そこから遷移できるページかどうか判定するとか。

Perlのモジュールだと、
* Plack::Middleware::CSRFBlock
* Amon2::Plugin::Web::CSRFDefender

# セッションハイジャック（なりすまし）
前提：セッションIDはユーザーごとに一意な値である。

## もしもセッションIDが連番だったら
簡単に他の人のセッションIDが分かっちゃうよねよねよねよね。
出来る事は考えるまでもないですね。

## もしもセッションIDがstaticな値から生成されていたら
簡単に他の人のセッションIDが分かっちゃうよねよねよねよね。
出来る事は考えるまでもないですね。

## もしもセッションIDがランダムな値だったら
他の人のセッションIDなんてそう簡単にわからないですよねー。
ただし[線形合同法](http://ja.wikipedia.org/wiki/%E7%B7%9A%E5%BD%A2%E5%90%88%E5%90%8C%E6%B3%95)でセッションID生成してる奴は今すぐ腹を切って（ｒｙ
線形合同法は奇数と偶数が交互に出てきて分かりやすい上に周期が短いのでセキュリティに関わる部分で使うべきじゃないです。

## ベストアンサーは？
個人的にはメルセンヌ・ツイスタ（Math::Random::MT）で生成してしまえばいいかなと。
速度が要求されるならXOR Shift（Math::Random::Xorshift）でしょうか。
一意な値である必要があるのでそのへんの処理を云々する必要はもちろんあるけど。

# Open Redirector

たとえばこんなコードは、アカン。

```perl
sub dispatch_index {
my $self = shift;
my $url  = $self->req->param('url');

return $self->redirect($url);
}
```

なぜって？同一オリジンと見せかけて、他の任意のドメインへのアクセスになってしまうので、
たとえば http://hoge/?url=http%3A%2F%2Fakuinoaru.com%2F など、悪意のあるURLへの踏み台に出来てしまいます。
これがなぜ悪いか？それは、SPAMメールなどの踏み台サーバーとして使えてしまうからです。
メールはFromヘッダなどが簡単に偽装できるので、その上でリンク先のドメインがホンモノだと、
多くの人はホンモノのメールと見分けが付かないので、簡単に騙されてしまいます。

対策としては、urlとして自由な文字列を受け付けないのが最も効果的です。
あるいは、urlとして入力可能な文字列として、自社のドメインか相対パス以外を許可しないように、
正規表現などを使って制限するべきです。

# セキュリティホールを作らないための心構え
自分が書いたコードにたいして如何にしたら悪い事ができるかを考える。
できるならば、どうしたら防げるかを考える。
これを習慣化する。

特に警戒するべき処理

* 単純な文字列結合
  * 特にループが絡むケース
* 外部からの入力を直接出力に渡すケース
* バリデーション処理の不在
* 不十分なバリデーション
  * 特に正規表現の誤りには気づきにくいので要注意

# まとめ
Webアプリは簡単にセキュリティホールが開くので、
よく吟味して実装方法を考え、コードを書きましょう。
多くの場合、内部設計の時点で問題があるので、
その時点でどのような攻撃が可能かシミュレートしてみましょう。

## 参考

* http://d.hatena.ne.jp/Hamachiya2/20120522/csrf
* http://ma.la/files/avtokyo2012/
* http://d.hatena.ne.jp/hasegawayosuke/20130302/p1
* http://d.hatena.ne.jp/hasegawayosuke/20130330/p1
* http://subtech.g.hatena.ne.jp/mala/20121018/1350551669
* http://subtech.g.hatena.ne.jp/cho45/20121011/1349926337
* http://view.officeapps.live.com/op/view.aspx?src=http%3A%2F%2Futf-8.jp%2Fpublic%2F20120928%2F20120928-yapc-hasegawa.pptx
* http://www.slideshare.net/ockeghem/phpcondo
* http://subtech.g.hatena.ne.jp/mala/20120327/1332862477
* http://blog.64p.org/entry/20111125/1322185155
* http://takagi-hiromitsu.jp/diary/20070203.html
* http://www.atmarkit.co.jp/fsecurity/special/137mailosaka/mailosaka01.html
