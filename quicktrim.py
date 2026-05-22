import pandas as pd

df = pd.read_csv('backend/data/emails.csv')
df.head(5000).to_csv('backend/data/emails_sample.csv', index=False)
