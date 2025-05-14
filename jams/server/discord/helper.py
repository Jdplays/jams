import inspect

# Discord temporary RSVP value store
_rsvp_selection_store = {}

def store_rsvp_selection(message_db_id, selection):
    _rsvp_selection_store[message_db_id] = selection

def pop_rsvp_selection(message_db_id):
    return _rsvp_selection_store.pop(message_db_id, [])

def make_stub_view(view_class:type):
    sig = inspect.signature(view_class.__init__)
    kwargs = {}
    
    for name, param in sig.parameters.items():
        if name in ('self', 'args', 'kwargs'):
            continue
        kwargs[name] = 'placeholder'
    
    return view_class(**kwargs)