import csv

with open('raxio2014.csv', 'rb') as csvfile:
    spamreader = csv.reader(csvfile)
    count = 0
    for row in spamreader:
        count += 1
        if count < 3:
            continue
        print row[4].replace(' ', '')[-8:]
