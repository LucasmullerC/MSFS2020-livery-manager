import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import { Box, Button, CircularProgress, Paper, Tooltip, Typography } from '@material-ui/core';
import FullTable from './FullTable';

import dayjs from 'dayjs';
import FetchAndParseManifest from '../../../helpers/Manifest/FetchAndParseManifest';

import ActiveApiEndpoint from '../../../data/ActiveApiEndpoint';
import Constants from '../../../data/Constants.json';
import PlaneNameTable from '../../../data/PlaneNameTable.json';

const RefreshInterval = 10 * 1000;

export default function AvailableLiveries(props) {
  const { fileListing, setFileListing } = props;
  let aircraft = [],
    sortedLiveries = {};

  const [refreshing, setRefreshing] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);

  const refreshBtnRef = useRef(null);

  useEffect(() => {
    let key;

    if (justRefreshed) {
      key = setInterval(() => {
        let now = new Date().getTime();

        if (now > justRefreshed + RefreshInterval) {
          setJustRefreshed(false);
          refreshBtnRef.current.innerText = `Refresh`;
          clearInterval(key);
        } else {
          const msLeft = justRefreshed + RefreshInterval - now;
          const sLeft = msLeft / 1000;

          refreshBtnRef.current.innerHTML = `Wait <span style="text-align: right; display: inline-block; width: 4ch; padding-left: 4px;">${
            Math.ceil(sLeft * 10) / 10
          }s</span>`;
        }
      }, 100);
    }

    return () => {
      clearInterval(key);
    };
  }, [justRefreshed, setJustRefreshed]);

  function UpdateFileList(callback) {
    FetchAndParseManifest(`${ActiveApiEndpoint}/${Constants.api.get.cdnFileListing}`)
      .then(d => {
        setFileListing({ checkedAt: new Date().getTime(), ...d });
        typeof callback === 'function' && callback();
      })
      .catch(() => setFileListing(null));
  }

  const loading = (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
      <CircularProgress style={{ margin: 'auto', marginBottom: 24 }} size={64} />
      <Typography variant="body1" style={{ paddingBottom: 2 }}>
        Loading...
      </Typography>
      <Typography variant="body2" color="textSecondary">
        This can take up to a minute
      </Typography>
    </div>
  );

  if (typeof fileListing === 'undefined') {
    UpdateFileList();
    return loading;
  } else if (refreshing) {
    return loading;
  } else if (fileListing && fileListing.data && fileListing.data.fileList) {
    // Create array of all aircraft with liveries, along with a thumbnail image
    const m = new Map();
    for (const item of fileListing.data.fileList) {
      if (!m.has(item.airplane)) {
        m.set(item.airplane, true);

        let thumb = fileListing.data.fileList.filter(a => a.airplane.toLowerCase() === item.airplane.toLowerCase()).find(a => a.image);
        thumb = thumb.image;

        aircraft.push({
          name: item.airplane.toLowerCase(),
          thumbnail: `${fileListing.data.cdnBaseUrl}/${thumb}`,
        });
      }
    }

    aircraft = aircraft.sort((a, b) =>
      (PlaneNameTable[a.name] || a.name).toLowerCase().localeCompare((PlaneNameTable[b.name] || b.name).toLowerCase())
    );

    let temp = {};

    aircraft.forEach(a => {
      temp[a.name] = [];
    });

    fileListing.data.fileList.forEach(livery => {
      temp[livery.airplane.toLowerCase()].push(livery);
    });

    for (const key in temp) {
      if (Object.prototype.hasOwnProperty.call(temp, key)) {
        /** @type {object[]} */
        const liverySet = temp[key];

        temp[key] = liverySet.sort((a, b) => a.fileName.toLowerCase().localeCompare(b.fileName.toLowerCase()));
      }
    }

    sortedLiveries = temp;
  }

  return (
    <div>
      <Paper style={{ marginBottom: 16 }}>
        <Box p={2} display="flex" flexDirection="row">
          <Typography color="textSecondary" variant="body2" style={{ lineHeight: '33px' }}>
            Last updated: {dayjs(fileListing.checkedAt).format('D MMM YYYY, h:mm A') || 'unknown'}
          </Typography>
          <Box flex={1} />
          <Box>
            <Tooltip title={justRefreshed ? `Rate limiting is in effect: you need to wait ${RefreshInterval / 1000}s between refreshes` : ''}>
              <span>
                <Button
                  disabled={justRefreshed}
                  onClick={() => {
                    setRefreshing(true);
                    UpdateFileList(() => {
                      setRefreshing(false);
                      setJustRefreshed(new Date().getTime());
                    });
                  }}
                  ref={refreshBtnRef}
                >
                  Refresh
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Paper>
      {fileListing && <FullTable sortedLiveries={sortedLiveries} allAircraft={aircraft} />}
    </div>
  );
}

AvailableLiveries.propTypes = {
  setFileListing: PropTypes.func.isRequired,
  fileListing: PropTypes.shape({
    checkedAt: PropTypes.number.isRequired,
    data: PropTypes.shape({
      cdnBaseUrl: PropTypes.string.isRequired,
      fileList: PropTypes.arrayOf(
        PropTypes.shape({
          airplane: PropTypes.string.isRequired,
          fileName: PropTypes.string.isRequired,
          generation: PropTypes.string.isRequired,
          metaGeneration: PropTypes.string.isRequired,
          lastModified: PropTypes.string.isRequired,
          ETag: PropTypes.string.isRequired,
          size: PropTypes.string.isRequired,
          checkSum: PropTypes.string.isRequired,
          image: PropTypes.string,
          smallImage: PropTypes.string,
        }).isRequired
      ),
    }),
  }),
};
