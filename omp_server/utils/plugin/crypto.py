import base64
import hashlib
import os
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5, AES
from base64 import urlsafe_b64decode, urlsafe_b64encode
from Crypto import Random

from django.conf import settings


class AESCryptor:
    """ AES 加密器 """

    def __init__(self):
        self.__encryptKey = settings.SECRET_KEY
        self.__key = hashlib.md5(self.__encryptKey.encode("utf8")).digest()

    @staticmethod
    def pad(text, block_size=32):
        pad = block_size - (len(text) % block_size)
        return (text + pad * chr(pad)).encode("utf8")

    @staticmethod
    def un_pad(text):
        index = text[-1]
        return text[:-index].decode("utf8")

    def encode(self, plaintext):
        """ AES 加密 """
        ciphertext = AES.new(
            self.__key, AES.MODE_ECB
        ).encrypt(self.pad(plaintext))
        return urlsafe_b64encode(ciphertext).decode("utf8").rstrip("=")

    def decode(self, ciphertext):
        """ AES 解密 """
        ciphertext = urlsafe_b64decode(
            ciphertext + "=" * (4 - len(ciphertext) % 4))
        cipher = AES.new(self.__key, AES.MODE_ECB)
        return self.un_pad(cipher.decrypt(ciphertext))


def decrypt_rsa(encrypt_str, private_key=settings.PRIVATE_KEY):
    rsakey = RSA.importKey(private_key.encode())
    cipher = PKCS1_v1_5.new(rsakey)
    st = base64.b64decode(encrypt_str.encode())
    return cipher.decrypt(st, sentinel="").decode()


def rsa_utils(plain_text, action="public"):
    """
    action: public 加密  private解密
    """
    # 伪随机数生成器
    if action not in ["public", "private"]:
        return False
    random_generator = Random.new().read
    pem_file = os.path.join(settings.PROJECT_DIR, f'config/{action}.pem')
    with open(pem_file) as f1:
        key1 = f1.read()
        key = RSA.import_key(key1)
    cipher_rsa = PKCS1_v1_5.new(key)
    if action == "public":
        cipher_text = base64.b64encode(cipher_rsa.encrypt(plain_text.encode('utf-8')))
    else:
        cipher_text = cipher_rsa.decrypt(base64.b64decode(plain_text), random_generator)
    return cipher_text.decode('utf-8')
