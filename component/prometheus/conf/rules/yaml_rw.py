import os
import yaml


files = os.listdir('./')
for file in files:
    print(file)
    if file.endswith('py'):
        continue
    with open(file, 'r') as f:
        result = yaml.load(f.read(), Loader=yaml.FullLoader)
    for ele in result["groups"][0]["rule_tpls"]:
        ele["annotations"]["consignee"] = "cw-email-address"
    with open(file, 'w', encoding='utf-8') as f2:
        yaml.dump(data=result, stream=f2, allow_unicode=True)

