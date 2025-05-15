# trends.py
import sys
import json
from pytrends.request import TrendReq

keyword = sys.argv[1]
pytrends = TrendReq(hl='en-US', tz=360)
pytrends.build_payload([keyword], cat=0, timeframe='today 12-m', geo='')

data = pytrends.interest_over_time().reset_index()
result = [
    {
        "date": row["date"].strftime("%Y-%m-%d"),
        "value": int(row[keyword])
    }
    for _, row in data.iterrows() if "isPartial" not in row or not row["isPartial"]
]

print(json.dumps(result))
