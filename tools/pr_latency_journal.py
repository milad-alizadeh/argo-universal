"""Replay browser requests in arrival order to count load at registration."""

from dataclasses import dataclass


@dataclass
class Request:
    requested: int
    outstanding: int
    started: int | None = None
    finished: int | None = None

    def observe(self, event, when):
        if event == "acquire":
            self.started = when
        elif event == "release":
            self.finished = when


def valid_line(parts):
    return len(parts) == 3 and parts[0].isdigit()


def events(lines):
    for line in lines:
        parts = line.split()
        if valid_line(parts):
            yield int(parts[0]), parts[1], parts[2]


class RequestSample:
    def __init__(self, cutoff, limit):
        self.cutoff = cutoff
        self.limit = limit
        self.outstanding = set()
        self.rows = {}

    def request(self, when, token):
        if when >= self.cutoff and len(self.rows) < self.limit:
            self.rows[token] = Request(when, len(self.outstanding))
        self.outstanding.add(token)

    def update_outstanding(self, when, token, event):
        if event == "request":
            self.request(when, token)
        elif event in ("release", "gone"):
            self.outstanding.discard(token)

    def observe(self, when, token, event):
        self.update_outstanding(when, token, event)
        row = self.rows.get(token)
        if row:
            row.observe(event, when)


def sample_requests(lines, cutoff, limit):
    sample = RequestSample(cutoff, limit)
    for entry in events(lines):
        sample.observe(*entry)
    return list(sample.rows.values())
