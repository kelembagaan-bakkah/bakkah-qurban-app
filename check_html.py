from html.parser import HTMLParser
import pathlib

data = pathlib.Path('Index.html').read_text(encoding='utf-8')

class T(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag in ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']:
            return
        self.stack.append((tag, self.getpos()))

    def handle_endtag(self, tag):
        if self.stack and self.stack[-1][0] == tag:
            self.stack.pop()
        else:
            self.errors.append((tag, self.getpos(), self.stack[-1] if self.stack else None))

parser = T()
parser.feed(data)
print('errors', parser.errors)
print('unclosed', parser.stack[-5:])
