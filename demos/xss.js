let xss = [
	`<p><img src="x" onerror="alert(1)"></p>`,
	`<p>abc<iframe//src=jAva&Tab;script:alert(3)>def</p>`,
	`<svg><g/onload=alert(2)//<p>`,
	`<math><mi//xlink:href="data:x,<script>alert(4)</script>">`,
	`<TABLE><tr><td>HELLO</tr></TABL>`,
	`<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgiSGVsbG8iKTs8L3NjcmlwdD4=">test</a>`
];