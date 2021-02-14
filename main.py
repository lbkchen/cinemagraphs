import imageio

reader = imageio.get_reader("./video_preview_h264.mp4")

for i, im in enumerate(reader):
    print('Mean of frame %i is %1.1f' % (i, im.mean()))
    break
