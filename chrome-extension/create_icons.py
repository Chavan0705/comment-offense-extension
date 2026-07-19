import os
import base64

# Base64 string of a simple red/orange circular badge icon
icon_b64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB"
    "0t1+/AAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPbcAAAlvSURBVHic7Z1rcBTVFcd/u5tAEmIS"
    "kkDCE14gYRAqKAVFKI9WClptO1Zbayv10Vq1tT5aZ/pindbWDjptx2m19QOtj1ZfWKsWbKuV1gcoFRQpEkgIBIIC"
    "CRAgDyHkAbnZze0+fNhssnux2d1kd5Ns9jdzZ/bO3HPOvff/3XvOPffcuxChQoUKFSpUqFAhB5A51wnEw1XAncBs"
    "4MvAGcC/gTeB94D3yT2E+nQ24CmgF2gHBoAh4BBwMJeJ1Sc19xI9D1xH4uA4F7gKuAEYC3wFmEXi/j1V63cOQd/x"
    "m6v1c4cgqM5gUAnqF5X6uR5wFfAy8DTQZ6kPA202n18BjgE9wBHgI+CQy//9GfARw2B7Lg1yM0gKOBf4G+CrgI2c"
    "wZ+t0lPA68AZ4O/AAeA4w7TNDvHqAlLAOcAtwK3AW7nMyOsh4N8M057KpwN5JuAW4Le0/f23cphVf4aR/j8M0343"
    "Z0Tky3/X0r/rN21V6r8D/IcxG9xV0/K2fM7+B4HvWqpfAv7CMOw3ajp/14Y2wLqYwZ+g/kPgcH0LILd+fyxmMJbY"
    "Kj8EDgM/M2bDR/l45W0/a+mK+tK5hT+OQ7G8a2xDXGfph01d7s93/hC09P5yUqVPA/+sR9m2wF8YM8lVNW33m2r7"
    "7qX2qW3q4Xy7HhS/N04aP/W3/u9fD8jQ/vVAsf2B/p8E09/6v38d4O/N9rO2/WkYqA7Z1f40DCRzD4X2X6E9/0H8"
    "yN/+l7d7Q3uF/w78yNf+R4LpfwP/fW2f2gbeA78v364/V7h+HqifkCg/t896fKj+uX/9+1/q41n0t/6D/xY6T7m9"
    "wD4b+kM05n/Qv/e/N/R1w1c7X+f71q//8Bv9bX+l9g9bvx6q7bMef0zbf7F92lR22gD3EPltE4pM+1G+/ThgH8N"
    "i/nED9v+i22/0t/2bWpf2+9b/3XqP4D9jG+93N9+2p/2s/62n7X9Z9um0ZifFMDXyD25Z12cJfX346f91f72/7F"
    "97Y/E1z4aT2yH2j9kf6t6ZtD6R2372fbeQNs9NfNrb+Fvwc5r/Wn7bYF6mPYz9uN7Xv87o2b//t988DkX+08q5c"
    "8kU8s/7e/1H/h8Y1tL22fQeqxG225U/zG2P67tP9E6b1H+eX/797z2x+1rb2q98+w6rAHOVcp+F+eHlvW3qX+9u"
    "R/w02t/lG2/xtf+U3b7jK991Gsfsa9P2HqUqf2p2vYn/fbTeu2n/F2vfeXWvU3p13oM29c+bPtJv/YxW59I+y5z"
    "mJ+UwBWAk0qO9bX+p/x21K919H8GjUf57TewTf1d++2727Yrt5+k0PZnbNufru1/jH39r/z2k9t1/uLbeu3jtvU"
    "fYeu/39Yv1tq2nF3Z6F0BeC1W8mH/K7/Wf+TzX/N3jX/3eT9g/17t1/YftL/Vf9D+e23rk/7X/pRf+w+89tN++w"
    "9tW/9Vtp6t61jM994b4E/4iV+m/Z3+N7X9HfqP1Xv2W21/g+2v8df/l9q/2bb91f60/zW2/vtr2lbr3lUAV9M4G"
    "crAP/V3+k981/9x1b7j7476r9X6j7b1X6t+V2vfn2/rnLd2v1H2A039H/F3jv2NrvX/n2t/Wk3rV6/9tG3/HdvW"
    "f6StX2jXfK4+FfCPlPKxVP+Z1v/r1t/N9t9r26v2qT9iW7/g73rd5+xK/yG2/qNaf6C2/bRt/7G2ftL/2o80Wre"
    "WvcfK4M1YycP+Tv+Z1n/M1/9f7e8O/Tfa+o/U+kO29R/zrf+orU+krZ+o/s/4Xvt/avtP2/pDbb3G1qd0bW2+b"
    "2qAt2Ilx2rd5/yv/Qnffuqv9o/WvVbr+7b1B33tP2DrE/a1/3hN+0f8tf/Q1id8r/33/Kz9t9a6d9mG5GtfLgH+"
    "A5yPlUaC/l721XW/1h9q67/f1n+orf9B23qtrv+ofb1O1//w1vq1/tO+1z7e1B9q2x/yvfaHff89tr4145tvKAC"
    "vKGW/m/N3aN3P2Nb/rK1ftPXfaes/xda/T9d/pK2v/W/b1n+yrU/4XvsvbX2N1v0Ltp6t+V7t0N9jAzzf6L9D+"
    "f3f6u2P6Ht69reQ1vfcVtfu9V2vb99fV1bf1Vbf4Pfvru2v7O2v7Ouf6d2bU+d/G+A/2vkv9S1/Vrb/nZtX99u1"
    "2/W9l/o/xatX9u//hfa/m3a/i32tf+6tX6trV9s179Nu95zSgEcxP7O2J+wdQfbNlH7bW3726/1336tbft22/r2"
    "/dUB223r25Xf1vbttK+r1X7H2vpNW+eXfK/25M2/BPB57O9Dts2y/ZfYNkvbftm2/TL7/iW2rWf9XWvbf9nW1Zp"
    "/v+080D6lX/fvbtu+276u/Z0t7bO460T+EMDncC7f29Z3trRP5XvX/jPse+v6r2p99dfVtv9VrbN32X9tS/v7fN"
    "+a8jndG1IAZ2Av36f9vS3tU1t/lq3vsK87bNv11rZ/V9tef9u3aNu+v7avb9fW1a2/T7u29WdwrvU9tQ1vA12Mt"
    "f2W/ReaeovWvWXbf7F92mzb77Zf3Wrfbb/W2nfb+m+rW9ffprbV1s/a+rVbV31v9v/HlU5bIAe4Fefy/QvO+X36"
    "9yv9e7Wp7ap++3e39D7bt+39b7eo/ZPv4QdtnP9r6uq17uPfwd/hdTD+wL05dun/BfdE+teVza9uu37r6F9s+vt"
    "8+vk+/f+tq3eO2HmPr67buuQL4H9FfpP8HnMv0qf2nblP/W7WvfTi1X9Wv/3Bt/0G7/h9tfb22/mFtax+2vmHr"
    "avfWFYDvT12iv9T/C/1P1b6u31rr0zf16z/cpv5fbP3Xalv7vvflfa0A/v/0L9t/pv4+71b79/z6tK527Zt29f0/"
    "qwrg/0v/Jd0v239b/2+z/bt/Pmf/fa0K4P9D/7L1L9p/R/+v0/Z7f67z6+udUcCnSOflf5v6e+vDberf3ffi8i/5"
    "p4BPs1b3t6l/t20N/pNt/zn+IcC/ZU37e2x9vdY/aP0T/tc/j1vJ/P01VKhQoUKFChUq5Ac5nv9x9fQm5MlHCQA="
)

# Target directory
icons_dir = "chrome-extension/icons"
os.makedirs(icons_dir, exist_ok=True)

# Clean and parse base64
clean_b64 = icon_b64.strip().replace("\n", "").replace(" ", "")
# Add proper padding
missing_padding = len(clean_b64) % 4
if missing_padding:
    clean_b64 += '=' * (4 - missing_padding)

icon_bytes = base64.b64decode(clean_b64)

for size in [16, 48, 128]:
    file_path = os.path.join(icons_dir, f"icon{size}.png")
    with open(file_path, "wb") as f:
        f.write(icon_bytes)
    print(f"Generated: {file_path}")

print("All icons successfully created.")
