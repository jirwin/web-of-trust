#!/bin/bash

python parse_key_sheet_csv.py | while read line; do
    echo "$line"
    gpg --keyserver pgp.mit.edu --no-default-keyring --keyring raxio2014.gpg --recv-key "$line"
done
